# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.utils import timezone
from plane.db.models import Page, Project, ProjectPage, ProjectMember, WorkspaceMember, FileAsset, User

pytestmark = [pytest.mark.contract, pytest.mark.django_db]


@pytest.fixture
def pages(workspace, create_user):
    cache.clear()
    project = Project.objects.create(workspace=workspace, name="Assigned", identifier="ASSIGN", network=0)
    other = Project.objects.create(workspace=workspace, name="Other", identifier="OTHER", network=0)
    ProjectMember.objects.create(workspace=workspace, project=project, member=create_user, role=15)
    owner = User.objects.create(email="page-owner@example.invalid", username="page-owner")

    def make(name, target=project, **kw):
        page = Page.objects.create(
            workspace=workspace, owned_by=owner, name=name, description_html="<p>Live content</p>", **kw
        )
        ProjectPage.objects.create(workspace=workspace, project=target, page=page)
        return page

    public = make("Shared with project")
    private = make("Private", access=Page.PRIVATE_ACCESS)
    archived = make("Archived", archived_at=timezone.now().date())
    elsewhere = make("Other project", target=other)
    removed = make("Removed")
    ProjectPage.objects.filter(page=removed).update(deleted_at=timezone.now())
    asset = FileAsset.objects.create(
        workspace=workspace,
        project=project,
        page=public,
        entity_type=FileAsset.EntityTypeContext.PAGE_DESCRIPTION,
        asset="test/page.png",
        attributes={"name": "page.png", "type": "image/png"},
        size=12,
        is_uploaded=True,
    )
    return {
        "project": project,
        "other": other,
        "public": public,
        "private": private,
        "archived": archived,
        "elsewhere": elsewhere,
        "removed": removed,
        "asset": asset,
    }


def url(workspace, pages, suffix=""):
    return f"/api/v1/workspaces/{workspace.slug}/projects/{pages['project'].id}/pages/{suffix}"


def test_lists_only_active_public_project_pages(api_key_client, workspace, pages):
    response = api_key_client.get(url(workspace, pages))
    assert response.status_code == 200
    rows = response.json()["results"]
    assert [r["id"] for r in rows] == [str(pages["public"].id)]
    assert set(rows[0]) == {"id", "name", "updated_at", "revision"}


@pytest.mark.parametrize("key", ["private", "archived", "elsewhere", "removed"])
def test_hidden_pages_are_not_found(api_key_client, workspace, pages, key):
    response = api_key_client.get(url(workspace, pages, f"{pages[key].id}/"))
    assert response.status_code == 404


def test_reads_current_html_and_revision_without_staff_metadata(api_key_client, workspace, pages):
    target = url(workspace, pages, f"{pages['public'].id}/")
    first = api_key_client.get(target).json()
    assert first["description_html"] == "<p>Live content</p>"
    assert first["assets"][0]["id"] == str(pages["asset"].id)
    assert set(first) == {"id", "name", "updated_at", "revision", "description_html", "assets"}
    Page.objects.filter(id=pages["public"].id).update(description_html="<p>Edited in Plane</p>")
    second = api_key_client.get(target).json()
    assert second["revision"] != first["revision"]
    assert second["description_html"] == "<p>Edited in Plane</p>"


@pytest.mark.parametrize("scope", ["workspace", "project", "guest"])
def test_revoked_members_and_guests_cannot_read(api_key_client, workspace, create_user, pages, scope):
    if scope == "workspace":
        WorkspaceMember.objects.filter(workspace=workspace, member=create_user).update(is_active=False)
    elif scope == "project":
        ProjectMember.objects.filter(project=pages["project"], member=create_user).update(is_active=False)
    else:
        ProjectMember.objects.filter(project=pages["project"], member=create_user).update(role=5)
    assert api_key_client.get(url(workspace, pages)).status_code == 403


def test_read_only_and_anonymous_denied(api_key_client, api_client, workspace, pages):
    assert api_key_client.post(url(workspace, pages), {"name": "Unauthorized write"}, format="json").status_code == 405
    api_client.credentials()
    assert api_client.get(url(workspace, pages)).status_code in (401, 403)


def test_inline_asset_requires_matching_public_page(api_key_client, workspace, pages):
    asset = pages["asset"]
    public = pages["public"]
    target = url(workspace, pages, f"{public.id}/assets/{asset.id}/")
    with patch("plane.api.views.page.S3Storage") as storage:
        storage.return_value.generate_presigned_url.return_value = "https://storage.example/image"
        assert api_key_client.get(target).status_code == 302
        assert storage.return_value.generate_presigned_url.call_args.kwargs["disposition"] == "inline"
        storage.reset_mock()
        Page.objects.filter(id=public.id).update(access=Page.PRIVATE_ACCESS)
        assert api_key_client.get(target).status_code == 404
        storage.assert_not_called()


@pytest.mark.parametrize(
    "change", [{"is_uploaded": False}, {"is_deleted": True}, {"is_archived": True}, {"entity_type": "ISSUE_ATTACHMENT"}]
)
def test_unavailable_assets_not_exposed(api_key_client, workspace, pages, change):
    FileAsset.objects.filter(id=pages["asset"].id).update(**change)
    target = url(workspace, pages, f"{pages['public'].id}/assets/{pages['asset'].id}/")
    assert api_key_client.get(target).status_code == 404


def test_asset_cannot_be_swapped_from_another_page(api_key_client, workspace, pages):
    FileAsset.objects.filter(id=pages["asset"].id).update(page=pages["private"])
    target = url(workspace, pages, f"{pages['public'].id}/assets/{pages['asset'].id}/")
    assert api_key_client.get(target).status_code == 404


def test_generic_asset_route_cannot_bypass_page_privacy(api_key_client, workspace, pages):
    Page.objects.filter(id=pages["public"].id).update(access=Page.PRIVATE_ACCESS)
    target = f"/api/v1/workspaces/{workspace.slug}/assets/{pages['asset'].id}/"
    with patch("plane.api.views.asset.S3Storage") as storage:
        assert api_key_client.get(target).status_code == 404
        storage.assert_not_called()


def test_pages_paginate(api_key_client, workspace, pages):
    page = Page.objects.create(workspace=workspace, owned_by=pages["public"].owned_by, name="Second")
    ProjectPage.objects.create(workspace=workspace, project=pages["project"], page=page)
    first = api_key_client.get(url(workspace, pages) + "?per_page=1").json()
    assert len(first["results"]) == 1 and first["next_page_results"]
    second = api_key_client.get(url(workspace, pages) + "?per_page=1&cursor=" + first["next_cursor"]).json()
    assert len(second["results"]) == 1
    assert first["results"][0]["id"] != second["results"][0]["id"]
