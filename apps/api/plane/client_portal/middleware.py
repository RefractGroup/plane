# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
from django.http import JsonResponse
from .models import ClientAccount


def is_client(user):
    return bool(user and user.is_authenticated and ClientAccount.objects.filter(user=user).exists())


def client_path_allowed(path, method):
    return path.startswith("/api/client/") or (path == "/api/instances/" and method == "GET")


class ClientBoundaryMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/") and is_client(request.user):
            if not client_path_allowed(request.path, request.method):
                return JsonResponse({"error": "Not found"}, status=404)
        response = self.get_response(request)
        if request.path.startswith("/api/client/"):
            response["Cache-Control"] = "private, no-store"
            response["Vary"] = "Cookie"
            response["X-Content-Type-Options"] = "nosniff"
        return response
