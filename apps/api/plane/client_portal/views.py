# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
import hashlib
import json
import uuid
from datetime import date
from html import escape
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.authentication import SessionAuthentication
from rest_framework import serializers
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from plane.db.models import (
    Project,
    ProjectMember,
    WorkspaceMember,
    User,
    Issue,
    IssueComment,
    State,
    Intake,
    IntakeIssue,
    FileAsset,
    Label,
    IssueLabel,
)
from plane.api.views.page import readable_pages, page_assets, page_record
from plane.settings.storage import S3Storage
from plane.license.models import InstanceAdmin
from .models import ClientAccount, ClientPortal, ClientAccess, SharedDocument, ClientRequest, ClientAction
from .middleware import is_client
from .content import client_html


class ClientThrottle(UserRateThrottle):
    rate = "120/minute"


class PortalView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    throttle_classes = [ClientThrottle]

    def handle_exception(self, exc):
        if isinstance(exc, (Http404, NotFound)):
            return Response({"detail": "Not found."}, status=404)
        return super().handle_exception(exc)


def managed_projects(user):
    if is_client(user):
        return Project.objects.none()
    return Project.objects.filter(
        id__in=ProjectMember.objects.filter(member=user, is_active=True, role=20).values("project_id"),
        workspace_id__in=WorkspaceMember.objects.filter(member=user, is_active=True, role=20).values("workspace_id"),
        archived_at__isnull=True,
    )


def portals():
    return ClientPortal.objects.filter(
        active=True, project__archived_at__isnull=True, project__deleted_at__isnull=True
    ).select_related("project", "project__workspace")


def client_scope(request, slug, write=False):
    portal = get_object_or_404(portals(), slug=slug)
    if ClientAccess.objects.filter(portal=portal, account_id=request.user.id, active=True).exists():
        return portal
    if (
        not write
        and request.query_params.get("preview") == "1"
        and managed_projects(request.user).filter(id=portal.project_id).exists()
    ):
        return portal
    raise NotFound()


def admin_scope(request, slug):
    return get_object_or_404(portals().filter(project__in=managed_projects(request.user)), slug=slug)


def visible_issues(portal):
    # A removed/misconfigured Client label fails closed. Requests remain visible to their client.
    shared = Q(clientrequest__portal=portal)
    if (
        portal.client_label_id
        and Label.objects.filter(id=portal.client_label_id, project_id=portal.project_id).exists()
    ):
        shared |= Q(
            id__in=IssueLabel.objects.filter(label_id=portal.client_label_id, project_id=portal.project_id).values(
                "issue_id"
            )
        )
    return (
        Issue.objects.filter(shared, project_id=portal.project_id, archived_at__isnull=True, is_draft=False)
        .select_related("state")
        .distinct()
    )


def issue_record(issue):
    return {
        "id": str(issue.id),
        "name": issue.name,
        "sequence": issue.sequence_id,
        "status": issue.state.name if issue.state else "Unstarted",
        "group": issue.state.group if issue.state else "unstarted",
        "priority": issue.priority,
        "due_date": issue.target_date,
        "start_date": issue.start_date,
    }


def task_assets(portal, issue):
    return FileAsset.objects.filter(
        project_id=portal.project_id,
        workspace_id=portal.project.workspace_id,
        issue=issue,
        entity_type__in=["ISSUE_ATTACHMENT", "ISSUE_DESCRIPTION"],
        is_uploaded=True,
        is_deleted=False,
        is_archived=False,
    )


def file_record(asset, base):
    return {
        "id": str(asset.id),
        "name": asset.attributes.get("name", "Attachment"),
        "size": asset.size,
        "url": f"{base}{asset.id}/",
    }


def plain_html(text):
    return "<p>" + escape(text).replace("\n", "<br>") + "</p>"


def text_value(data, name, limit, required=True):
    value = data.get(name, "")
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise ValidationError({name: f"Enter {name.replace('_', ' ')} (up to {limit} characters)."})
    return value.strip()


def action(request, portal, kind, payload, callback):
    try:
        key = uuid.UUID(str(request.data.get("operation_id", "")))
    except ValueError:
        raise ValidationError("A valid operation ID is required.")
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    # Serialize writes for this client; receipt and Plane objects commit together. Retrying is safe.
    with transaction.atomic():
        ClientPortal.objects.select_for_update().get(id=portal.id)
        previous = ClientAction.objects.filter(portal=portal, actor=request.user, key=key).first()
        if previous:
            if previous.kind != kind or previous.digest != digest:
                raise ValidationError("This operation ID has already been used for different content.")
            return Response(previous.result)
        result = callback()
        ClientAction.objects.create(portal=portal, actor=request.user, key=key, kind=kind, digest=digest, result=result)
    return Response(result, status=201)


class SessionView(PortalView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"user": None, "clients": [], "managed": []})
        return Response(
            {
                "user": {"name": request.user.display_name or request.user.first_name, "email": request.user.email},
                "clients": list(
                    portals().filter(access__account_id=request.user.id, access__active=True).values("name", "slug")
                ),
                "managed": list(portals().filter(project__in=managed_projects(request.user)).values("name", "slug")),
                "projects": list(managed_projects(request.user).values("id", "name", "identifier")),
            }
        )


class WorkView(PortalView):
    def get(self, request, slug):
        portal = client_scope(request, slug)
        issues = visible_issues(portal)
        if request.query_params.get("requests") == "1":
            issues = issues.filter(clientrequest__portal=portal)
        if request.query_params.get("search"):
            issues = issues.filter(name__icontains=request.query_params["search"][:200])
        if request.query_params.get("group"):
            issues = issues.filter(state__group=request.query_params["group"])
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
        except ValueError:
            raise ValidationError("Invalid offset")
        return Response(
            {
                "name": portal.name,
                "count": issues.count(),
                "results": [
                    issue_record(i)
                    for i in issues.order_by("state__sequence", "sort_order", "id")[offset : offset + 100]
                ],
            }
        )

    def post(self, request, slug):
        portal = client_scope(request, slug, write=True)
        name = text_value(request.data, "name", 255)
        description = text_value(request.data, "description", 20000)
        priority = request.data.get("priority", "none")
        if priority not in ("none", "low", "medium", "high", "urgent"):
            raise ValidationError("Invalid priority")
        try:
            due = date.fromisoformat(request.data["due_date"]) if request.data.get("due_date") else None
        except (ValueError, TypeError):
            raise ValidationError("Invalid date")
        payload = {"name": name, "description": description, "priority": priority, "due_date": str(due)}

        def create():
            if not portal.project.intake_view:
                raise ValidationError("Requests are unavailable. Please contact Refract.")
            intake = Intake.objects.filter(project=portal.project).first()
            if not intake:
                raise ValidationError("Requests are unavailable. Please contact Refract.")
            state = State.triage_objects.filter(project=portal.project).first()
            if not state:
                state = State.objects.create(
                    project=portal.project,
                    workspace=portal.project.workspace,
                    name="Triage",
                    group="triage",
                    color="#4E5355",
                    sequence=65000,
                )
            issue = Issue.objects.create(
                project=portal.project,
                workspace=portal.project.workspace,
                name=name,
                description_html=plain_html(description),
                priority=priority,
                target_date=due,
                state=state,
                created_by=request.user,
            )
            IntakeIssue.objects.create(
                project=portal.project,
                workspace=portal.project.workspace,
                issue=issue,
                intake=intake,
                source="IN_APP",
                external_source="refract-client-portal",
            )
            ClientRequest.objects.create(portal=portal, issue=issue, submitted_by=request.user)
            return {"id": str(issue.id)}

        return action(request, portal, "request", payload, create)


class TaskView(PortalView):
    def get(self, request, slug, issue_id):
        portal = client_scope(request, slug)
        issue = get_object_or_404(visible_issues(portal), id=issue_id)
        assets = list(task_assets(portal, issue))
        base = f"/api/client/{slug}/work/{issue.id}/files/"
        data = issue_record(issue)
        data["description_html"] = client_html(
            issue.description_html, assets, base, "?preview=1" if request.query_params.get("preview") == "1" else ""
        )
        data["files"] = [file_record(a, base) for a in assets if a.entity_type == "ISSUE_ATTACHMENT"]
        data["comments"] = [
            {
                "id": str(c.id),
                "html": client_html(c.comment_html, [], ""),
                "created_at": c.created_at,
                "author": "You"
                if c.actor_id == request.user.id
                else ("Client" if ClientAccount.objects.filter(user_id=c.actor_id).exists() else "Refract"),
            }
            for c in IssueComment.objects.filter(issue=issue, project=portal.project, access="EXTERNAL").order_by(
                "created_at"
            )
        ]
        intake = IntakeIssue.objects.filter(issue=issue).first()
        data["request_status"] = intake.get_status_display() if intake else None
        return Response(data)

    def post(self, request, slug, issue_id):
        portal = client_scope(request, slug, write=True)
        issue = get_object_or_404(visible_issues(portal), id=issue_id)
        body = text_value(request.data, "body", 20000)

        def create():
            comment = IssueComment.objects.create(
                project=portal.project,
                workspace=portal.project.workspace,
                issue=issue,
                actor=request.user,
                comment_html=plain_html(body),
                access="EXTERNAL",
                external_source="refract-client-portal",
            )
            return {"id": str(comment.id)}

        return action(request, portal, "reply", {"issue": str(issue.id), "body": body}, create)


class DocumentsView(PortalView):
    def get(self, request, slug, page_id=None):
        portal = client_scope(request, slug)
        pages = readable_pages(portal.project.workspace.slug, portal.project_id).filter(
            id__in=SharedDocument.objects.filter(portal=portal).values("page_id")
        )
        if page_id:
            page = get_object_or_404(pages, id=page_id)
            data = page_record(page, detail=True)
            assets = list(page_assets(portal.project.workspace.slug, portal.project_id, page.id))
            data["description_html"] = client_html(
                page.description_html,
                assets,
                f"/api/client/{slug}/documents/{page.id}/files/",
                "?preview=1" if request.query_params.get("preview") == "1" else "",
            )
            return Response(data)
        return Response({"results": [page_record(p) for p in pages]})


def download(asset):
    # Proxy bytes rather than handing out a bearer URL that survives access revocation.
    storage = S3Storage()
    obj = storage.s3_client.get_object(Bucket=storage.aws_storage_bucket_name, Key=asset.asset.name)
    if obj["ContentLength"] > 50 * 1024 * 1024:
        obj["Body"].close()
        raise ValidationError("File exceeds the download limit.")
    mime = asset.attributes.get("type", "")
    raster = mime in ("image/png", "image/jpeg", "image/webp", "image/gif") and asset.entity_type != "ISSUE_ATTACHMENT"
    response = FileResponse(
        obj["Body"],
        content_type=mime if raster else "application/octet-stream",
        as_attachment=not raster,
        filename=asset.attributes.get("name", "download"),
    )
    response["Content-Length"] = str(obj["ContentLength"])
    return response


class FilesView(PortalView):
    def get(self, request, slug, asset_id, issue_id=None, page_id=None):
        portal = client_scope(request, slug)
        if issue_id:
            issue = get_object_or_404(visible_issues(portal), id=issue_id)
            asset = get_object_or_404(task_assets(portal, issue), id=asset_id)
        else:
            get_object_or_404(SharedDocument.objects.filter(portal=portal), page_id=page_id)
            get_object_or_404(readable_pages(portal.project.workspace.slug, portal.project_id), id=page_id)
            asset = get_object_or_404(
                page_assets(portal.project.workspace.slug, portal.project_id, page_id), id=asset_id
            )
        return download(asset)

    def post(self, request, slug, issue_id):
        portal = client_scope(request, slug, write=True)
        issue = get_object_or_404(visible_issues(portal), id=issue_id)
        uploaded = request.FILES.get("file")
        if not uploaded or uploaded.size > 10 * 1024 * 1024:
            raise ValidationError("Choose a file of up to 10 MB.")
        data = uploaded.read()
        name = uploaded.name[:200]

        def create():
            storage = S3Storage()
            key = f"{portal.project.workspace_id}/portal/{uuid.uuid4().hex}"
            storage.s3_client.put_object(
                Bucket=storage.aws_storage_bucket_name, Key=key, Body=data, ContentType="application/octet-stream"
            )
            try:
                asset = FileAsset.objects.create(
                    workspace=portal.project.workspace,
                    project=portal.project,
                    issue=issue,
                    asset=key,
                    entity_type="ISSUE_ATTACHMENT",
                    attributes={"name": name, "type": "application/octet-stream"},
                    size=len(data),
                    is_uploaded=True,
                    created_by=request.user,
                )
            except Exception:
                storage.s3_client.delete_object(Bucket=storage.aws_storage_bucket_name, Key=key)
                raise
            return {"id": str(asset.id)}

        return action(
            request,
            portal,
            "upload",
            {"issue": str(issue.id), "name": name, "sha256": hashlib.sha256(data).hexdigest()},
            create,
        )


class ManageView(PortalView):
    def get(self, request, slug):
        portal = admin_scope(request, slug)
        selected = set(SharedDocument.objects.filter(portal=portal).values_list("page_id", flat=True))
        return Response(
            {
                "name": portal.name,
                "slug": portal.slug,
                "documents": [
                    {**page_record(p), "shared": p.id in selected}
                    for p in readable_pages(portal.project.workspace.slug, portal.project_id)
                ],
                "people": list(
                    ClientAccess.objects.filter(portal=portal).values("account_id", "account__user__email", "active")
                ),
                "activity": list(
                    ClientAction.objects.filter(portal=portal).order_by("-created_at").values("kind", "created_at")[:50]
                ),
            }
        )

    def post(self, request, slug):
        portal = admin_scope(request, slug)
        kind = request.data.get("action")
        with transaction.atomic():
            ClientPortal.objects.select_for_update().get(id=portal.id)
            if kind == "document":
                page = get_object_or_404(
                    readable_pages(portal.project.workspace.slug, portal.project_id),
                    id=serializers.UUIDField().run_validation(request.data.get("page_id")),
                )
                if request.data.get("shared") is True:
                    SharedDocument.objects.get_or_create(portal=portal, page=page, defaults={"shared_by": request.user})
                else:
                    SharedDocument.objects.filter(portal=portal, page=page).delete()
            elif kind == "person":
                email = text_value(request.data, "email", 255).lower()
                user = get_object_or_404(User.objects.filter(is_active=True), email=email)
                if (
                    user.is_staff
                    or user.is_superuser
                    or InstanceAdmin.objects.filter(user=user).exists()
                    or WorkspaceMember.objects.filter(member=user).exists()
                    or ProjectMember.objects.filter(member=user).exists()
                ):
                    raise ValidationError(
                        (
                            "This account has internal workspace access. Migrate it separately before enablin"
                            "g client access."
                        )
                    )
                account, _ = ClientAccount.objects.get_or_create(user=user)
                ClientAccess.objects.update_or_create(
                    portal=portal, account=account, defaults={"active": request.data.get("active") is True}
                )
            else:
                raise ValidationError("Unknown action")
            ClientAction.objects.create(
                portal=portal, actor=request.user, key=uuid.uuid4(), kind=kind, digest="", result={}
            )
        return Response({"saved": True})


class CreatePortalView(PortalView):
    def post(self, request):
        project = get_object_or_404(
            managed_projects(request.user), id=serializers.UUIDField().run_validation(request.data.get("project_id"))
        )
        from django.core.validators import validate_slug
        from django.core.exceptions import ValidationError as DjangoValidationError

        slug = text_value(request.data, "slug", 80).lower()
        try:
            validate_slug(slug)
        except DjangoValidationError:
            raise ValidationError("Use letters, numbers and hyphens for the address.")
        if (
            slug in ("manage", "new", "login")
            or "instances" in slug
            or ClientPortal.objects.filter(Q(slug=slug) | Q(project=project)).exists()
        ):
            raise ValidationError("This address or project already has a client portal.")
        label, _ = Label.objects.get_or_create(
            project=project, workspace=project.workspace, name="Client", defaults={"color": "#6E44FF"}
        )
        portal = ClientPortal.objects.create(
            project=project, name=text_value(request.data, "name", 120), slug=slug, client_label=label
        )
        return Response({"slug": portal.slug}, status=201)


class ProjectPortalView(PortalView):
    def get(self, request, project_id):
        if is_client(request.user):
            raise NotFound()
        get_object_or_404(
            ProjectMember.objects.filter(
                member=request.user,
                is_active=True,
                role__gte=15,
                workspace_id__in=WorkspaceMember.objects.filter(member=request.user, is_active=True).values(
                    "workspace_id"
                ),
            ),
            project_id=project_id,
        )
        return Response({"enabled": portals().filter(project_id=project_id).exists()})


class SignOutView(PortalView):
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import logout

        logout(request)
        return Response({"signed_out": True})
