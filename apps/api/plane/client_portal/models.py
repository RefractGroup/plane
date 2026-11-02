# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
import uuid
from django.db import models


class ClientAccount(models.Model):
    # Kept after access is revoked: a former client must never fall through to staff APIs.
    user = models.OneToOneField("db.User", on_delete=models.CASCADE, primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ClientPortal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField("db.Project", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=80, unique=True)
    active = models.BooleanField(default=True)
    client_label = models.ForeignKey("db.Label", null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)


class ClientAccess(models.Model):
    portal = models.ForeignKey(ClientPortal, on_delete=models.CASCADE, related_name="access")
    account = models.ForeignKey(ClientAccount, on_delete=models.CASCADE)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["portal", "account"], name="portal_unique_access")]


class SharedDocument(models.Model):
    portal = models.ForeignKey(ClientPortal, on_delete=models.CASCADE)
    page = models.ForeignKey("db.Page", on_delete=models.CASCADE)
    shared_by = models.ForeignKey("db.User", null=True, on_delete=models.SET_NULL)
    shared_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["portal", "page"], name="portal_unique_document")]


class ClientRequest(models.Model):
    portal = models.ForeignKey(ClientPortal, on_delete=models.CASCADE)
    issue = models.OneToOneField("db.Issue", on_delete=models.CASCADE)
    submitted_by = models.ForeignKey("db.User", on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)


class ClientAction(models.Model):
    portal = models.ForeignKey(ClientPortal, on_delete=models.CASCADE)
    actor = models.ForeignKey("db.User", on_delete=models.PROTECT)
    key = models.UUIDField()
    kind = models.CharField(max_length=40)
    digest = models.CharField(max_length=64)
    result = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["portal", "actor", "key"], name="portal_unique_action")]
