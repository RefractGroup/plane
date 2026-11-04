# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
from django.db.models import Case, F, IntegerField, Value, When
from django.utils import timezone
from rest_framework.exceptions import ValidationError


def work_view(issues, params):
    """Filter and order the already-authorised queryset, before pagination."""
    view = params.get("view", "all")
    if view == "active":
        issues = issues.exclude(state__group__in=["completed", "cancelled"])
    elif view == "completed":
        issues = issues.filter(state__group="completed")
    elif view == "overdue":
        issues = issues.exclude(state__group__in=["completed", "cancelled"]).filter(
            target_date__lt=timezone.localdate()
        )
    elif view != "all":
        raise ValidationError("Unknown work view.")
    priority = params.get("priority")
    if priority:
        if priority not in ["urgent", "high", "medium", "low", "none"]:
            raise ValidationError("Unknown priority.")
        issues = issues.filter(priority=priority)
    sort = params.get("sort", "manual")
    if sort == "due":
        return issues.order_by(F("target_date").asc(nulls_last=True), "sequence_id", "id")
    if sort == "newest":
        return issues.order_by("-created_at", "id")
    if sort == "priority":
        return issues.annotate(
            priority_order=Case(
                *[When(priority=p, then=Value(i)) for i, p in enumerate(["urgent", "high", "medium", "low"])],
                default=Value(4),
                output_field=IntegerField(),
            )
        ).order_by("priority_order", F("target_date").asc(nulls_last=True), "id")
    if sort != "manual":
        raise ValidationError("Unknown sort order.")
    return issues.order_by("state__sequence", "sort_order", "id")
