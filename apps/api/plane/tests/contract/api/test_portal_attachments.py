# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
from unittest.mock import patch
import pytest
from django.core.cache import cache
from plane.db.models import Project, ProjectMember, Issue, FileAsset, State

pytestmark = [pytest.mark.contract, pytest.mark.django_db]


@pytest.fixture
def files(workspace, create_user):
    cache.clear()
    project = Project.objects.create(workspace=workspace, name="Private", identifier="FILES", network=0)
    membership = ProjectMember.objects.create(workspace=workspace, project=project, member=create_user, role=15)
    state = State.objects.create(workspace=workspace, project=project, name="Todo", group="unstarted")
    issue = Issue.objects.create(workspace=workspace, project=project, name="Visible task", state=state)
    other = Issue.objects.create(workspace=workspace, project=project, name="Hidden task", state=state)
    asset = FileAsset.objects.create(
        workspace=workspace,
        project=project,
        issue=issue,
        entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
        asset="test/attachment.txt",
        attributes={"name": "attachment.txt", "type": "text/plain"},
        is_uploaded=True,
        size=12,
        storage_metadata={"size": 12},
    )
    base = f"/api/v1/workspaces/{workspace.slug}/projects/{project.id}/work-items/"
    return membership, issue, other, asset, base


def test_outsider_cannot_list_attachment_metadata(api_key_client, files):
    member, issue, _, _, base = files
    member.is_active = False
    member.save()
    assert api_key_client.get(base + f"{issue.id}/attachments/").status_code == 403


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_asset_must_belong_to_url_work_item(api_key_client, files, method):
    _, _, other, asset, base = files
    target = base + f"{other.id}/attachments/{asset.id}/"
    with patch("plane.api.views.issue.S3Storage") as storage:
        response = getattr(api_key_client, method)(target)
        assert response.status_code == 404
        storage.assert_not_called()
    asset.refresh_from_db()
    assert not asset.is_deleted and asset.is_uploaded


def test_member_can_list_and_download_own_task_attachment(api_key_client, files):
    _, issue, _, asset, base = files
    assert api_key_client.get(base + f"{issue.id}/attachments/").json()[0]["id"] == str(asset.id)
    with patch("plane.api.views.issue.S3Storage") as storage:
        storage.return_value.generate_presigned_url.return_value = "https://storage.example/attachment"
        assert api_key_client.get(base + f"{issue.id}/attachments/{asset.id}/").status_code == 302


def test_generic_route_does_not_bypass_project_membership(api_key_client, workspace, files):
    member, _, _, asset, _ = files
    member.is_active = False
    member.save()
    target = f"/api/v1/workspaces/{workspace.slug}/assets/{asset.id}/"
    with patch("plane.api.views.asset.S3Storage") as storage:
        assert api_key_client.get(target).status_code == 404
        assert api_key_client.patch(target, {"is_uploaded": False}, format="json").status_code == 404
        storage.assert_not_called()


def test_generic_upload_requires_project_membership(api_key_client, workspace, files):
    member, _, _, asset, _ = files
    member.is_active = False
    member.save()
    target = f"/api/v1/workspaces/{workspace.slug}/assets/"
    with patch("plane.api.views.asset.S3Storage") as storage:
        response = api_key_client.post(
            target,
            {"project_id": str(asset.project_id), "name": "wrong.txt", "type": "text/plain", "size": 12},
            format="json",
        )
        assert response.status_code == 404
        storage.assert_not_called()


def test_generic_download_uses_actual_storage_adapter(api_key_client, workspace, files):
    _, _, _, asset, _ = files
    response = api_key_client.get(f"/api/v1/workspaces/{workspace.slug}/assets/{asset.id}/")
    assert response.status_code == 200
    assert response.json()["asset_url"].startswith("http")
