"""Synthetic local fixture. Refuses non-local WEB_URL and requires an explicit password."""

import os
from datetime import timedelta
from urllib.parse import urlsplit
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from plane.db.models import (
    User,
    Profile,
    Workspace,
    WorkspaceMember,
    Project,
    ProjectMember,
    State,
    Label,
    Issue,
    IssueLabel,
    IssueComment,
    Page,
    ProjectPage,
    Intake,
)
from plane.license.models import Instance
from plane.client_portal.models import ClientAccount, ClientPortal, ClientAccess, SharedDocument


class Command(BaseCommand):
    help = "Seed a local client interface preview with synthetic records only."

    def handle(self, *args, **options):
        if urlsplit(settings.WEB_URL or "").hostname not in ("localhost", "127.0.0.1"):
            raise CommandError("Local previews only.")
        password = os.environ.get("CLIENT_PREVIEW_PASSWORD")
        if not password:
            raise CommandError("Set CLIENT_PREVIEW_PASSWORD for this local fixture.")
        staff, _ = User.objects.get_or_create(
            email="staff@preview.invalid",
            defaults={"username": "preview-staff", "display_name": "Refract team", "first_name": "Refract"},
        )
        client, _ = User.objects.get_or_create(
            email="client@preview.invalid",
            defaults={"username": "preview-client", "display_name": "Alex", "first_name": "Alex"},
        )
        for user in (staff, client):
            user.set_password(password)
            user.save()
            Profile.objects.get_or_create(user=user, defaults={"is_onboarded": True})
        ws, _ = Workspace.objects.get_or_create(
            slug="client-preview", defaults={"name": "Local preview", "owner": staff}
        )
        WorkspaceMember.objects.get_or_create(workspace=ws, member=staff, defaults={"role": 20})
        p, _ = Project.objects.get_or_create(
            workspace=ws, identifier="DEMO", defaults={"name": "Example client", "network": 0, "intake_view": True}
        )
        ProjectMember.objects.get_or_create(workspace=ws, project=p, member=staff, defaults={"role": 20})
        Intake.objects.get_or_create(project=p, workspace=ws, name="Intake")
        label, _ = Label.objects.get_or_create(project=p, workspace=ws, name="Client", defaults={"color": "#6E44FF"})
        portal, _ = ClientPortal.objects.get_or_create(
            project=p, defaults={"name": "Example client", "slug": "example-client", "client_label": label}
        )
        account, _ = ClientAccount.objects.get_or_create(user=client)
        ClientAccess.objects.get_or_create(portal=portal, account=account)
        records = [
            ("Review the website outline", "started", "In progress", "high", 3),
            ("Confirm the next fortnight’s priorities", "started", "In progress", "medium", 5),
            ("Share feedback on the homepage", "unstarted", "Waiting for feedback", "medium", 7),
            ("Prepare the project brief", "completed", "Done", "none", -2),
            ("Agree the review process", "completed", "Done", "none", -3),
        ]
        for title, group, status, priority, days in records:
            state, _ = State.objects.get_or_create(
                project=p, name=status, defaults={"workspace": ws, "group": group, "color": "#6E44FF"}
            )
            issue, new = Issue.objects.get_or_create(
                project=p,
                name=title,
                defaults={
                    "workspace": ws,
                    "state": state,
                    "priority": priority,
                    "target_date": timezone.now().date() + timedelta(days=days),
                    "description_html": (
                        "<h2>What we’re working on</h2><p>Review the proposed structure and share any cha"
                        "nges before the next stage begins.</p><h2>What we need from you</h2><ul><li>Chec"
                        "k that the outline covers the right topics.</li><li>Add feedback in the conversa"
                        "tion below.</li></ul><p>This is sample content for the local interface preview.<"
                        "/p>"
                    ),
                },
            )
            IssueLabel.objects.get_or_create(issue=issue, label=label, defaults={"workspace": ws, "project": p})
            if new:
                IssueComment.objects.create(
                    workspace=ws,
                    project=p,
                    issue=issue,
                    actor=staff,
                    access="EXTERNAL",
                    comment_html=(
                        "<p>The outline is ready for your review. Let us know if there’s anything you’d l"
                        "ike to change.</p>"
                    ),
                )
                IssueComment.objects.create(
                    workspace=ws,
                    project=p,
                    issue=issue,
                    actor=staff,
                    access="INTERNAL",
                    comment_html="<p>Internal fixture: this must never appear in the client view.</p>",
                )
        Issue.objects.get_or_create(project=p, name="Internal planning fixture", defaults={"workspace": ws})
        for name in ("Project overview", "How we work together", "Review notes"):
            page, _ = Page.objects.get_or_create(
                workspace=ws,
                name=name,
                defaults={
                    "owned_by": staff,
                    "description_html": (
                        "<h2>A shared place for the work</h2><p>Your tasks, documents and conversations a"
                        "re kept together here.</p><h3>Reviewing work</h3><p>Open a task to see its descr"
                        "iption, attachments and conversation. Share feedback with your Refract team in t"
                        "he reply box.</p><h3>Making a request</h3><p>Choose New request, add a title and"
                        " the details, then send it to the team. The request stays visible in your worksp"
                        "ace.</p><blockquote>This document contains sample content for the local preview."
                        "</blockquote>"
                    ),
                },
            )
            ProjectPage.objects.get_or_create(workspace=ws, project=p, page=page)
            SharedDocument.objects.get_or_create(portal=portal, page=page, defaults={"shared_by": staff})
        Instance.objects.get_or_create(
            instance_id="local-client-preview",
            defaults={
                "instance_name": "Local preview",
                "current_version": "v1.4.3",
                "last_checked_at": timezone.now(),
                "is_setup_done": True,
                "is_test": True,
                "is_telemetry_enabled": False,
            },
        )
        self.stdout.write("Synthetic client preview ready. No invitations or email sent.")
