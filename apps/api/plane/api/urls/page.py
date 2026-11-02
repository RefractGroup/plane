# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
from django.urls import path
from plane.api.views.page import ProjectPageListAPIEndpoint, ProjectPageDetailAPIEndpoint, ProjectPageAssetAPIEndpoint

urlpatterns = [
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/pages/",
        ProjectPageListAPIEndpoint.as_view(http_method_names=["get"]),
        name="api-project-pages",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/pages/<uuid:page_id>/",
        ProjectPageDetailAPIEndpoint.as_view(http_method_names=["get"]),
        name="api-project-page-detail",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/pages/<uuid:page_id>/assets/<uuid:asset_id>/",
        ProjectPageAssetAPIEndpoint.as_view(http_method_names=["get"]),
        name="api-project-page-asset",
    ),
]
