# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

"""Read-only project pages for authenticated server integrations.

These routes never publish a page. The portal applies its own explicit sharing
allowlist in addition to these workspace, project, page and asset checks.
"""

import hashlib
import json

from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from plane.db.models import FileAsset, Page, ProjectMember, WorkspaceMember
from plane.settings.storage import S3Storage
from .base import BaseAPIView


class ProjectPageIntegrationPermission(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_anonymous:
            return False
        slug = view.kwargs["slug"]
        return (
            WorkspaceMember.objects.filter(workspace__slug=slug, member=request.user, is_active=True).exists()
            and ProjectMember.objects.filter(
                workspace__slug=slug,
                project_id=view.kwargs["project_id"],
                project__archived_at__isnull=True,
                project__deleted_at__isnull=True,
                member=request.user,
                is_active=True,
                role__gte=15,
            ).exists()
        )


def readable_pages(slug, project_id):
    return (
        Page.objects.filter(
            workspace__slug=slug,
            access=Page.PUBLIC_ACCESS,
            archived_at__isnull=True,
            moved_to_page__isnull=True,
            moved_to_project__isnull=True,
            project_pages__project_id=project_id,
            project_pages__deleted_at__isnull=True,
        )
        .distinct()
        .order_by("sort_order", "id")
    )


def page_record(page, detail=False):
    revision = hashlib.sha256(
        json.dumps([page.name, page.description_html], ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()
    data = {"id": str(page.id), "name": page.name, "updated_at": page.updated_at, "revision": revision}
    if detail:
        data["description_html"] = page.description_html
    return data


def page_assets(slug, project_id, page_id):
    return FileAsset.objects.filter(
        workspace__slug=slug,
        project_id=project_id,
        page_id=page_id,
        entity_type=FileAsset.EntityTypeContext.PAGE_DESCRIPTION,
        is_uploaded=True,
        is_deleted=False,
        is_archived=False,
    )


class ProjectPageListAPIEndpoint(BaseAPIView):
    permission_classes = [ProjectPageIntegrationPermission]

    def get(self, request, slug, project_id):
        queryset = readable_pages(slug, project_id)
        search = request.query_params.get("search", "").strip()[:200]
        if search:
            queryset = queryset.filter(name__icontains=search)
        response = self.paginate(
            request=request,
            queryset=queryset,
            default_per_page=50,
            max_per_page=100,
            on_results=lambda pages: [page_record(page) for page in pages],
        )
        response["Cache-Control"] = "private, no-store"
        return response


class ProjectPageDetailAPIEndpoint(BaseAPIView):
    permission_classes = [ProjectPageIntegrationPermission]

    def get(self, request, slug, project_id, page_id):
        page = get_object_or_404(readable_pages(slug, project_id), id=page_id)
        data = page_record(page, detail=True)
        data["assets"] = [
            {
                "id": str(asset.id),
                "name": asset.attributes.get("name", ""),
                "type": asset.attributes.get("type", ""),
                "size": asset.size,
            }
            for asset in page_assets(slug, project_id, page_id)
        ]
        return Response(data, headers={"Cache-Control": "private, no-store"})


class ProjectPageAssetAPIEndpoint(BaseAPIView):
    permission_classes = [ProjectPageIntegrationPermission]

    def get(self, request, slug, project_id, page_id, asset_id):
        get_object_or_404(readable_pages(slug, project_id), id=page_id)
        asset = get_object_or_404(page_assets(slug, project_id, page_id), id=asset_id)
        mime = (asset.attributes.get("type") or "").split(";")[0].strip().lower()
        disposition = "inline" if mime in {"image/png", "image/jpeg", "image/webp", "image/gif"} else "attachment"
        url = S3Storage(request=request).generate_presigned_url(
            object_name=asset.asset.name,
            disposition=disposition,
            filename=asset.attributes.get("name"),
        )
        response = HttpResponseRedirect(url)
        response["Cache-Control"] = "private, no-store"
        return response
