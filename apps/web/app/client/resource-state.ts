// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
export type ResourceState<T> = {
  path: string;
  retentionKey?: string;
  data?: T;
  error?: string;
  loading?: boolean;
};

/** Retained rows must never cross a workspace, access mode or resource boundary. */
export function visibleResource<T>(value: ResourceState<T> | undefined, path: string | null, retentionKey?: string) {
  const sameScope = value?.retentionKey === retentionKey;
  const current = !!path && value?.path === path && sameScope;
  const retained = !!path && !!retentionKey && sameScope;
  return {
    data: current || retained ? value?.data : undefined,
    error: current ? value?.error : undefined,
    loading: !!path && (!current || !!value?.loading),
  };
}
