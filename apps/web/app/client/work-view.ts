// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
export const groups = ["triage", "backlog", "unstarted", "started", "completed", "cancelled"];
export const groupNames: Record<string, string> = {
  triage: "New requests",
  backlog: "Backlog",
  unstarted: "To do",
  started: "In progress",
  completed: "Done",
  cancelled: "Cancelled",
};
export const views = { all: "All work", active: "Active", overdue: "Overdue", completed: "Completed" };
export const sorts = { manual: "Project order", due: "Due date", priority: "Priority", newest: "Newest first" };
export const priorityNames: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No priority",
};
export const priorities = ["urgent", "high", "medium", "low", "none"];
export function readWorkView(search: string) {
  const p = new URLSearchParams(search);
  return {
    query: (p.get("q") || "").slice(0, 200),
    group: groups.includes(p.get("group") || "") ? p.get("group")! : "",
    priority: priorities.includes(p.get("priority") || "") ? p.get("priority")! : "",
    view: Object.hasOwn(views, p.get("view") || "") ? p.get("view")! : "all",
    sort: Object.hasOwn(sorts, p.get("sort") || "") ? p.get("sort")! : "manual",
    board: p.get("layout") === "board",
    grouped: p.get("grouped") !== "0",
    showPriority: p.get("priorityColumn") !== "0",
    showDate: p.get("dateColumn") !== "0",
    offset: Math.max(0, Math.floor(Number(p.get("page")) || 0)) * 100,
  };
}
export function isOverdue(item: { due_date: string | null; group: string }, today = new Date()) {
  const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return !!item.due_date && item.due_date < day && !["completed", "cancelled"].includes(item.group);
}

/** Preserve project-specific state names, including multiple states in one group. */
export function groupWorkItems<T extends { group: string; status: string }>(items: T[], grouped: boolean) {
  if (!grouped) return [{ key: "all", group: "all", label: "All work items", items }];
  const sections: { key: string; group: string; label: string; items: T[] }[] = [];
  for (const group of [
    ...groups,
    ...new Set(items.map((item) => item.group).filter((candidate) => !groups.includes(candidate))),
  ]) {
    for (const item of items.filter((candidate) => candidate.group === group)) {
      const key = JSON.stringify([group, item.status]);
      let section = sections.find((candidate) => candidate.key === key);
      if (!section) {
        section = { key, group, label: item.status, items: [] };
        sections.push(section);
      }
      section.items.push(item);
    }
  }
  return sections;
}
