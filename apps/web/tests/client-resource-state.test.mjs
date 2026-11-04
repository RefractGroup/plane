import test from "node:test";
import assert from "node:assert/strict";
import { visibleResource } from "../app/client/resource-state.ts";

const previous = {
  path: "example/work/?priority=high",
  retentionKey: "example:false:false",
  data: { results: [{ id: "client-visible-work" }] },
};

test("filter changes retain the same workspace rows while reporting an update", () => {
  const next = visibleResource(previous, "example/work/?priority=low", previous.retentionKey);
  assert.equal(next.data, previous.data);
  assert.equal(next.loading, true);
  assert.equal(next.error, undefined);
  assert.equal(visibleResource(previous, previous.path, previous.retentionKey).loading, false);
});

test("previous rows cannot cross workspace, preview, request or disabled-resource boundaries", () => {
  for (const scope of ["other:false:false", "example:true:false", "example:false:true", undefined]) {
    // Even an identical path cannot override a changed access/data scope.
    assert.equal(visibleResource(previous, previous.path, scope).data, undefined);
    assert.equal(visibleResource(previous, "other/work/", scope).data, undefined);
  }
  assert.deepEqual(visibleResource(previous, null, previous.retentionKey), {
    data: undefined,
    error: undefined,
    loading: false,
  });
  const unscoped = { path: "example/documents/first", data: { name: "First page" } };
  assert.equal(visibleResource(unscoped, "example/documents/second").data, undefined);
});

test("access failures clear previous rows and errors do not follow a changed query", () => {
  const failed = { path: previous.path, retentionKey: previous.retentionKey, error: "Your access has changed." };
  assert.deepEqual(visibleResource(failed, failed.path, failed.retentionKey), {
    data: undefined,
    error: failed.error,
    loading: false,
  });
  assert.deepEqual(visibleResource(failed, "example/work/?priority=low", failed.retentionKey), {
    data: undefined,
    error: undefined,
    loading: true,
  });
});
