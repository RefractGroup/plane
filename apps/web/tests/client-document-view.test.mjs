import test from "node:test";
import assert from "node:assert/strict";
import { selectDocuments } from "../app/client/document-view.ts";
const pages = [
  { id: "a", name: "Website brief", updated_at: "2026-10-30T12:00:00Z" },
  { id: "b", name: "Brand guidelines", updated_at: "2026-11-01T12:00:00Z" },
  { id: "c", name: "Website plan", updated_at: "2026-10-28T12:00:00Z" },
];
test("page search ignores case and surrounding spaces", () => {
  assert.deepEqual(
    selectDocuments(pages, " WEBSITE ", "updated").map((p) => p.id),
    ["a", "c"]
  );
});
test("sorts newest first without mutating the API result", () => {
  assert.deepEqual(
    selectDocuments(pages, "", "updated").map((p) => p.id),
    ["b", "a", "c"]
  );
  assert.deepEqual(
    pages.map((p) => p.id),
    ["a", "b", "c"]
  );
});
test("alphabetic sort and no-match state", () => {
  assert.deepEqual(
    selectDocuments(pages, "", "name").map((p) => p.id),
    ["b", "a", "c"]
  );
  assert.deepEqual(selectDocuments(pages, "missing", "name"), []);
});
