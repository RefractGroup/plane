// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useState } from "react";
import { visibleResource } from "./resource-state";
import type { ResourceState } from "./resource-state";

export type Portal = { name: string; slug: string };
export type Session = {
  user: { name: string; email: string } | null;
  clients: Portal[];
  managed: Portal[];
  projects?: { id: string; name: string; identifier: string }[];
};
export type WorkItem = {
  id: string;
  name: string;
  sequence: number;
  status: string;
  group: string;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  start_date: string | null;
};
export type Task = WorkItem & {
  description_html: string;
  request_status: string | null;
  files: { id: string; name: string; size: number; url: string }[];
  comments: { id: string; html: string; created_at: string; author: string }[];
};
export type Doc = {
  id: string;
  name: string;
  updated_at: string;
  revision: string;
  description_html?: string;
  shared?: boolean;
};
export type Work = { name: string; count: number; results: WorkItem[] };

export async function csrf() {
  const response = await fetch("/auth/get-csrf-token/", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("Unable to establish a secure session. Reload and try again.");
  return (await response.json()).csrf_token as string;
}
export async function api<T>(
  path: string,
  body?: Record<string, unknown> | FormData,
  signal?: AbortSignal
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body) {
    headers["X-CSRFToken"] = await csrf();
    if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
  }
  const result = await fetch(`/api/client/${path}`, {
    method: body ? "POST" : "GET",
    headers,
    credentials: "same-origin",
    cache: "no-store",
    signal,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!result.ok) {
    if (result.status === 404) throw new Error("This page is unavailable or you no longer have access.");
    if (result.status === 401 || result.status === 403)
      throw new Error("Your session or access has changed. Sign in again to continue.");
    if (result.status === 429) throw new Error("Too many requests. Please wait a moment and try again.");
    const detail: unknown = await result.json().catch(() => null);
    const message =
      typeof detail === "object" && detail && "detail" in detail
        ? String(detail.detail)
        : typeof detail === "string"
          ? detail
          : null;
    throw new Error(message || "Unable to save this change. Please check your entries and try again.");
  }
  return result.json() as Promise<T>;
}
export function useResource<T>(path: string | null, options?: { retainDataFor: string }) {
  const retentionKey = options?.retainDataFor;
  const [value, setValue] = useState<ResourceState<T>>();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setValue((previous) => ({
      path,
      retentionKey,
      data: retentionKey && previous?.retentionKey === retentionKey ? previous.data : undefined,
      loading: true,
    }));
    api<T>(path, undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setValue({ path, retentionKey, data });
        return data;
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setValue({ path, retentionKey, error: error.message });
      });
    return () => controller.abort();
  }, [path, version, retentionKey]);
  return {
    ...visibleResource(value, path, retentionKey),
    reload: () => setVersion((x) => x + 1),
  };
}
export function shortDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
        new Date(value.length === 10 ? `${value}T12:00:00` : value)
      )
    : "No date";
}
