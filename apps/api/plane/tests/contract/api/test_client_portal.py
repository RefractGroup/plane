# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
import io
import uuid
from unittest.mock import patch
import pytest
from django.test import Client
from django.utils import timezone
from rest_framework.test import APIClient
from plane.db.models import (
    User,
    Project,
    WorkspaceMember,
    ProjectMember,
    Label,
    Issue,
    IssueComment,
    State,
    Page,
    ProjectPage,
    FileAsset,
    Intake,
    APIToken,
)
from plane.client_portal.models import (
    ClientAction,
    ClientAccount,
    ClientAccess,
    ClientPortal,
    SharedDocument,
    ClientRequest,
)

pytestmark = [pytest.mark.contract, pytest.mark.django_db]


@pytest.fixture
def portal_fixture(workspace, create_user):
    p = Project.objects.create(workspace=workspace, name="Client A", identifier="CLIA", network=0, intake_view=True)
    other = Project.objects.create(workspace=workspace, name="Client B", identifier="CLIB", network=0)
    state = State.objects.create(workspace=workspace, project=p, name="In progress", group="started", color="#6e44ff")
    label = Label.objects.create(workspace=workspace, project=p, name="Client")
    portal = ClientPortal.objects.create(project=p, name="Client A", slug="client-a", client_label=label)
    bportal = ClientPortal.objects.create(project=other, name="Client B", slug="client-b")
    user = User.objects.create_user(
        email="client-a@example.invalid", username="client-a", password="local-test-password"
    )
    account = ClientAccount.objects.create(user=user)
    access = ClientAccess.objects.create(portal=portal, account=account)
    issue = Issue.objects.create(
        workspace=workspace, project=p, state=state, name="Client work", description_html="<p>Shared description</p>"
    )
    issue.labels.add(label, through_defaults={"project": p, "workspace": workspace})
    hidden = Issue.objects.create(workspace=workspace, project=p, state=state, name="Internal plans")
    foreign = Issue.objects.create(workspace=workspace, project=other, name="Other client secret")
    page = Page.objects.create(
        workspace=workspace,
        owned_by=create_user,
        name="Shared document",
        description_html="<h2>A plan</h2><p>Visible</p>",
    )
    ProjectPage.objects.create(workspace=workspace, project=p, page=page)
    SharedDocument.objects.create(portal=portal, page=page, shared_by=create_user)
    private = Page.objects.create(workspace=workspace, owned_by=create_user, name="Private document", access=1)
    ProjectPage.objects.create(workspace=workspace, project=p, page=private)
    SharedDocument.objects.create(portal=portal, page=private)
    IssueComment.objects.create(
        workspace=workspace,
        project=p,
        issue=issue,
        actor=create_user,
        comment_html="<p>Internal secret</p>",
        access="INTERNAL",
    )
    IssueComment.objects.create(
        workspace=workspace,
        project=p,
        issue=issue,
        actor=create_user,
        comment_html="<p>Client reply</p>",
        access="EXTERNAL",
    )
    asset = FileAsset.objects.create(
        workspace=workspace,
        project=p,
        issue=issue,
        entity_type="ISSUE_ATTACHMENT",
        asset="test/file.txt",
        attributes={"name": "file.txt", "type": "text/plain"},
        size=4,
        is_uploaded=True,
    )
    Intake.objects.get_or_create(workspace=workspace, project=p, name="Intake")
    ProjectMember.objects.create(workspace=workspace, project=p, member=create_user, role=20)
    WorkspaceMember.objects.filter(workspace=workspace, member=create_user).update(role=20)
    return locals()


@pytest.fixture
def client_api(portal_fixture):
    client = APIClient()
    client.force_authenticate(portal_fixture["user"])
    return client


def test_client_scope_and_trimmed_response(client_api, portal_fixture):
    f = portal_fixture
    session = client_api.get("/api/client/session/").json()
    assert session["clients"] == [{"name": "Client A", "slug": "client-a"}]
    assert session["managed"] == [] and session["projects"] == []
    response = client_api.get("/api/client/client-a/work/")
    assert response.status_code == 200
    assert [x["name"] for x in response.json()["results"]] == ["Client work"]
    detail = client_api.get(f"/api/client/client-a/work/{f['issue'].id}/").json()
    assert len(detail["comments"]) == 1 and detail["comments"][0]["author"] == "Refract"
    assert "Internal secret" not in str(detail) and "actor" not in str(detail)
    assert "assignees" not in detail and "workspace" not in detail


@pytest.mark.parametrize("target", ["hidden", "foreign"])
def test_direct_unshared_ids_denied(client_api, portal_fixture, target):
    response = client_api.get(f"/api/client/client-a/work/{portal_fixture[target].id}/")
    assert response.status_code == 404


def test_other_slug_same_response_as_unknown(client_api):
    a = client_api.get("/api/client/client-b/work/")
    b = client_api.get("/api/client/unknown/work/")
    assert a.status_code == b.status_code == 404
    assert a.json() == b.json()


@pytest.mark.parametrize("change", ["membership", "portal", "project", "label"])
def test_revocation_applies_on_next_request(client_api, portal_fixture, change):
    f = portal_fixture
    if change == "membership":
        f["access"].active = False
        f["access"].save()
    elif change == "portal":
        f["portal"].active = False
        f["portal"].save()
    elif change == "project":
        f["p"].archived_at = timezone.now()
        f["p"].save()
    else:
        f["issue"].labels.clear()
    assert client_api.get(f"/api/client/client-a/work/{f['issue'].id}/").status_code == 404


def test_documents_are_explicit_and_private_pages_fail_closed(client_api, portal_fixture):
    f = portal_fixture
    rows = client_api.get("/api/client/client-a/documents/").json()["results"]
    assert [r["id"] for r in rows] == [str(f["page"].id)]
    assert client_api.get(f"/api/client/client-a/documents/{f['private'].id}/").status_code == 404
    SharedDocument.objects.filter(page=f["page"]).delete()
    assert client_api.get(f"/api/client/client-a/documents/{f['page'].id}/").status_code == 404


def test_sanitizer_removes_identity_embeds_and_unsafe_content(client_api, portal_fixture):
    f = portal_fixture
    f["issue"].description_html = (
        '<script>alert(1)</script><p onclick="bad()">Safe <span data-type="mention-user">'
        'Staff email</span></p><iframe src="https://evil.test"></iframe><img src="https:/'
        '/evil.test/track"><a href="/refract/settings/members">Internal</a><a href="javas'
        'cript:alert(1)">Bad</a>'
    )
    f["issue"].save()
    html = client_api.get(f"/api/client/client-a/work/{f['issue'].id}/").json()["description_html"]
    assert "Safe" in html
    for forbidden in ["Staff email", "script", "onclick", "iframe", "evil.test", "/refract/", "javascript:"]:
        assert forbidden not in html


def test_files_bind_parent_and_deny_revoked_task(client_api, portal_fixture):
    f = portal_fixture
    url = f"/api/client/client-a/work/{f['issue'].id}/files/{f['asset'].id}/"
    with patch("plane.client_portal.views.S3Storage") as storage:
        storage.return_value.s3_client.get_object.return_value = {"Body": io.BytesIO(b"test"), "ContentLength": 4}
        response = client_api.get(url)
        assert response.status_code == 200 and b"".join(response.streaming_content) == b"test"
        assert response["Cache-Control"] == "private, no-store"
        assert "attachment" in response["Content-Disposition"]
    assert client_api.get(url.replace(str(f["issue"].id), str(f["hidden"].id))).status_code == 404
    f["issue"].labels.clear()
    assert client_api.get(url).status_code == 404


def test_requests_and_replies_are_atomic_and_idempotent(client_api, portal_fixture):
    f = portal_fixture
    key = str(uuid.uuid4())
    payload = {"operation_id": key, "name": "Need a new page", "description": "Please help", "priority": "high"}
    a = client_api.post("/api/client/client-a/work/", payload, format="json")
    assert a.status_code == 201, a.content
    b = client_api.post("/api/client/client-a/work/", payload, format="json")
    assert a.json() == b.json() and ClientRequest.objects.count() == 1
    assert client_api.get("/api/client/client-a/work/?requests=1").json()["count"] == 1
    payload["name"] = "Changed request"
    assert client_api.post("/api/client/client-a/work/", payload, format="json").status_code == 400
    reply = {"operation_id": str(uuid.uuid4()), "body": "Thanks <script>evil</script>"}
    url = f"/api/client/client-a/work/{f['issue'].id}/"
    assert client_api.post(url, reply, format="json").status_code == 201
    assert client_api.post(url, reply, format="json").status_code == 200
    assert IssueComment.objects.filter(actor=f["user"], access="EXTERNAL").count() == 1
    assert "&lt;script&gt;" in IssueComment.objects.get(actor=f["user"]).comment_html


def test_staff_preview_cannot_post_as_client(portal_fixture):
    f = portal_fixture
    client = APIClient()
    client.force_authenticate(f["create_user"])
    assert client.get("/api/client/client-a/work/").status_code == 404
    assert client.get("/api/client/client-a/work/?preview=1").status_code == 200
    assert (
        client.post("/api/client/client-a/work/?preview=1", {"name": "Not allowed"}, format="json").status_code == 404
    )


def test_client_cannot_manage_sharing(client_api):
    assert client_api.get("/api/client/manage/client-a/").status_code == 404
    assert (
        client_api.post(
            "/api/client/manage/client-a/",
            {"action": "person", "email": "someone@example.invalid", "active": True},
            format="json",
        ).status_code
        == 404
    )


@pytest.mark.parametrize(
    "path",
    [
        "/api/users/me/workspaces/",
        "/api/workspaces/",
        "/api/users/me/",
        "/api/instances/admins/",
        "/api/public/workspaces/test/",
    ],
)
def test_real_session_blocks_staff_apis_even_with_accidental_membership(portal_fixture, path):
    f = portal_fixture
    WorkspaceMember.objects.create(workspace=f["workspace"], member=f["user"], role=20)
    ProjectMember.objects.create(workspace=f["workspace"], project=f["p"], member=f["user"], role=20)
    client = Client()
    client.force_login(f["user"])
    assert client.get(path).status_code in (401, 403, 404)
    f["access"].delete()
    assert client.get(path).status_code in (401, 403, 404)


def test_client_api_tokens_are_denied(portal_fixture):
    f = portal_fixture
    token = APIToken.objects.create(user=f["user"], label="forbidden-token")
    client = APIClient()
    client.credentials(HTTP_X_API_KEY=token.token)
    assert client.get("/api/v1/workspaces/test/projects/").status_code in (401, 403)


def test_csrf_required_and_anonymous_denied(portal_fixture):
    f = portal_fixture
    client = Client(enforce_csrf_checks=True)
    assert client.get("/api/client/client-a/work/").status_code in (401, 403)
    client.force_login(f["user"])
    assert client.post("/api/client/client-a/work/", data={"name": "test"}).status_code == 403


def test_pagination_has_no_hidden_items(client_api, portal_fixture):
    assert client_api.get("/api/client/client-a/work/?offset=100").json()["results"] == []
    assert client_api.get("/api/client/client-a/work/?search=internal").json()["count"] == 0
    assert client_api.get("/api/client/client-a/work/?offset=broken").status_code == 400


def test_native_plane_mentions_are_removed(client_api, portal_fixture):
    f = portal_fixture
    f[
        "page"
    ].description_html = (
        '<p>Visible</p><mention-component entity_identifier="staff-id">Private staff name</mention-component>'
    )
    f["page"].save()
    html = client_api.get(f"/api/client/client-a/documents/{f['page'].id}/").json()["description_html"]
    assert "Visible" in html and "Private staff name" not in html and "staff-id" not in html


def test_staff_metadata_and_sharing_are_scoped(portal_fixture, client_api):
    f = portal_fixture
    staff = APIClient()
    staff.force_authenticate(f["create_user"])
    assert staff.get(f"/api/client/project/{f['p'].id}/").json() == {"enabled": True}
    assert client_api.get(f"/api/client/project/{f['p'].id}/").status_code == 404
    assert (
        staff.post(
            "/api/client/manage/client-a/",
            {"action": "document", "page_id": str(f["private"].id), "shared": True},
            format="json",
        ).status_code
        == 404
    )
    response = staff.post(
        "/api/client/manage/client-a/",
        {"action": "document", "page_id": str(f["page"].id), "shared": False},
        format="json",
    )
    assert response.status_code == 200
    assert client_api.get(f"/api/client/client-a/documents/{f['page'].id}/").status_code == 404
    assert staff.get("/api/client/manage/client-b/").status_code == 404
    assert (
        staff.post("/api/client/manage/client-a/", {"action": "document", "page_id": "bad"}, format="json").status_code
        == 400
    )


def test_portal_cannot_grant_internal_users_client_access(portal_fixture):
    f = portal_fixture
    staff = APIClient()
    staff.force_authenticate(f["create_user"])
    assert (
        staff.post(
            "/api/client/manage/client-a/",
            {"action": "person", "email": f["create_user"].email, "active": True},
            format="json",
        ).status_code
        == 400
    )
    assert not ClientAccount.objects.filter(user=f["create_user"]).exists()


def test_attachment_upload_receipt_prevents_duplicate_storage_writes(client_api, portal_fixture):
    from django.core.files.uploadedfile import SimpleUploadedFile

    f = portal_fixture
    path = f"/api/client/client-a/work/{f['issue'].id}/files/"
    key = str(uuid.uuid4())
    with patch("plane.client_portal.views.S3Storage") as storage:
        first = client_api.post(path, {"file": SimpleUploadedFile("test.txt", b"test bytes"), "operation_id": key})
        second = client_api.post(path, {"file": SimpleUploadedFile("test.txt", b"test bytes"), "operation_id": key})
        assert first.status_code == 201 and second.status_code == 200
        assert first.json() == second.json()
        assert storage.return_value.s3_client.put_object.call_count == 1
    with patch("plane.client_portal.views.S3Storage") as storage:
        denied = client_api.post(
            path.replace(str(f["issue"].id), str(f["foreign"].id)),
            {"file": SimpleUploadedFile("test.txt", b"test"), "operation_id": str(uuid.uuid4())},
        )
        assert denied.status_code == 404 and not storage.called


def test_shared_page_image_proxy_checks_the_page_and_parent(client_api, portal_fixture):
    f = portal_fixture
    image = FileAsset.objects.create(
        workspace=f["workspace"],
        project=f["p"],
        page=f["page"],
        entity_type="PAGE_DESCRIPTION",
        asset="test/pixel.png",
        attributes={"name": "pixel.png", "type": "image/png"},
        size=4,
        is_uploaded=True,
    )
    f["page"].description_html = f'<p>Diagram</p><img src="{image.asset_url}" alt="Diagram">'
    f["page"].save()
    base = f"/api/client/client-a/documents/{f['page'].id}/"
    html = client_api.get(base).json()["description_html"]
    assert f"{base}files/{image.id}/" in html
    with patch("plane.client_portal.views.S3Storage") as storage:
        storage.return_value.s3_client.get_object.return_value = {"Body": io.BytesIO(b"png!"), "ContentLength": 4}
        response = client_api.get(f"{base}files/{image.id}/")
        assert response.status_code == 200 and b"".join(response.streaming_content) == b"png!"
        assert response["Content-Type"] == "image/png"
    SharedDocument.objects.filter(page=f["page"]).delete()
    assert client_api.get(f"{base}files/{image.id}/").status_code == 404


def test_request_failure_rolls_back_issue_and_receipt(client_api, portal_fixture):
    f = portal_fixture
    before = Issue.objects.count()
    with patch("plane.client_portal.views.IntakeIssue.objects.create", side_effect=RuntimeError("synthetic failure")):
        with pytest.raises(RuntimeError):
            client_api.post(
                "/api/client/client-a/work/",
                {"operation_id": str(uuid.uuid4()), "name": "Rollback check", "description": "Fail atomically"},
                format="json",
            )
    assert Issue.objects.count() == before
    assert not ClientAction.objects.filter(portal=f["portal"]).exists()


def test_malformed_rich_text_urls_are_removed():
    from plane.client_portal.content import client_html

    html = client_html('<p>Safe</p><a href="http://[">Broken link</a><img src="http://[">', [], "")
    assert "Safe" in html and "Broken link" in html
    assert "href" not in html and "<img" not in html


def test_sign_out_is_safe_after_session_expiry():
    client = APIClient(enforce_csrf_checks=True)
    response = client.post("/api/client/sign-out/", {}, format="json")
    assert response.status_code == 200
    assert response.data == {"signed_out": True}


def test_portal_address_cannot_select_instance_session(portal_fixture):
    f = portal_fixture
    project = Project.objects.create(workspace=f["workspace"], name="New client", identifier="NEWC")
    ProjectMember.objects.create(workspace=f["workspace"], project=project, member=f["create_user"], role=20)
    staff = APIClient()
    staff.force_authenticate(f["create_user"])
    response = staff.post(
        "/api/client/manage/",
        {"project_id": str(project.id), "name": "New client", "slug": "my-instances"},
        format="json",
    )
    assert response.status_code == 400
    assert not ClientPortal.objects.filter(project=project).exists()


def test_home_only_summarises_shared_current_records(client_api, portal_fixture):
    f = portal_fixture
    data = client_api.get("/api/client/client-a/home/").json()
    assert data["counts"] == {"active": 1, "completed": 0, "requests": 0, "pages": 1}
    assert [i["id"] for i in data["work"]] == [str(f["issue"].id)]
    assert [p["id"] for p in data["pages"]] == [str(f["page"].id)]
    assert data["performance_panels"] == []
    assert client_api.get("/api/client/client-b/home/").status_code == 404
    f["access"].active = False
    f["access"].save()
    assert client_api.get("/api/client/client-a/home/").status_code == 404


def test_home_counts_are_not_limited_to_work_page(client_api, portal_fixture):
    f = portal_fixture
    for n in range(102):
        issue = Issue.objects.create(workspace=f["workspace"], project=f["p"], state=f["state"], name=f"Request {n}")
        ClientRequest.objects.create(portal=f["portal"], issue=issue, submitted_by=f["user"])
    data = client_api.get("/api/client/client-a/home/").json()
    assert data["counts"]["active"] == 103
    assert data["counts"]["requests"] == 102
    assert len(data["work"]) == 5
    f["issue"].archived_at = timezone.now()
    f["issue"].save()
    assert client_api.get("/api/client/client-a/home/").json()["counts"]["active"] == 102


def test_home_panels_are_admin_managed_and_preview_is_scoped(client_api, portal_fixture):
    f = portal_fixture
    path = "/api/client/manage/client-a/"
    body = {"action": "home", "performance_panels": ["website", "attribution"]}
    assert client_api.post(path, body, format="json").status_code == 404
    staff = APIClient()
    staff.force_authenticate(f["create_user"])
    assert staff.post(path, body, format="json").status_code == 200
    assert staff.get(path).json()["performance_panels"] == body["performance_panels"]
    assert staff.get("/api/client/client-a/home/").status_code == 404
    assert staff.get("/api/client/client-a/home/?preview=1").json()["performance_panels"] == body["performance_panels"]
    assert staff.get("/api/client/client-b/home/?preview=1").status_code == 404
    for value in [["unknown"], ["website", "website"], "website", [None], {}]:
        assert staff.post(path, {"action": "home", "performance_panels": value}, format="json").status_code == 400
    assert staff.post(path, {"action": "home", "performance_panels": []}, format="json").status_code == 200
    assert client_api.get("/api/client/client-a/home/").json()["performance_panels"] == []
