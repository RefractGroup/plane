import test from "node:test";
import assert from "node:assert/strict";
import { readWorkView, isOverdue, groupWorkItems } from "../app/client/work-view.ts";

test("links restore filters, board, hidden columns and pagination together", () => {
  const result = readWorkView(
    "?q=homepage&view=active&group=started&priority=high&sort=due&layout=board&grouped=0&dateColumn=0&page=2&preview=1"
  );
  assert.deepEqual(result, {
    query: "homepage",
    view: "active",
    group: "started",
    priority: "high",
    sort: "due",
    board: true,
    grouped: false,
    showPriority: true,
    showDate: false,
    offset: 200,
  });
});
test("unknown and prototype-like values fall back to supported options", () => {
  const result = readWorkView("?view=__proto__&sort=constructor&priority=top&group=secret&page=-3");
  assert.equal(result.view, "all");
  assert.equal(result.sort, "manual");
  assert.equal(result.priority, "");
  assert.equal(result.group, "");
  assert.equal(result.offset, 0);
});
test("due today is not overdue and finished work is never overdue", () => {
  const now = new Date(2026, 10, 2, 23, 30);
  assert.equal(isOverdue({ due_date: "2026-11-02", group: "started" }, now), false);
  assert.equal(isOverdue({ due_date: "2026-11-01", group: "started" }, now), true);
  assert.equal(isOverdue({ due_date: "2026-11-01", group: "completed" }, now), false);
  assert.equal(isOverdue({ due_date: "2026-11-01", group: "cancelled" }, now), false);
  assert.equal(isOverdue({ due_date: null, group: "started" }, now), false);
});

test("grouping preserves custom state names instead of hiding client-review states", () => {
  const items = [
    { id: 1, group: "unstarted", status: "Waiting for feedback" },
    { id: 2, group: "unstarted", status: "Ready to start" },
    { id: 3, group: "started", status: "In progress" },
  ];
  const grouped = groupWorkItems(items, true);
  assert.deepEqual(
    grouped.map((s) => s.label),
    ["Waiting for feedback", "Ready to start", "In progress"]
  );
  assert.deepEqual(
    grouped.flatMap((s) => s.items.map((i) => i.id)),
    [1, 2, 3]
  );
  assert.deepEqual(groupWorkItems(items, false)[0].items, items);
});
