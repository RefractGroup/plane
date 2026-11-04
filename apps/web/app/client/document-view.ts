// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import type { Doc } from "./api";

export function selectDocuments(documents: Doc[], query: string, sort: "updated" | "name") {
  const term = query.trim().toLocaleLowerCase();
  return (
    documents
      .filter((document) => document.name.toLocaleLowerCase().includes(term))
      // eslint-disable-next-line unicorn/no-array-sort -- filter returns a new array; ES2023 toSorted is outside this app's target.
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
        const newest = (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0);
        return newest || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      })
  );
}
