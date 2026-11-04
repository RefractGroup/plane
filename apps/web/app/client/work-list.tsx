// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { CalendarDays, ChevronDown, ChevronRight, WorkItemsIcon, IntakeIcon, Plus } from "@plane/propel/refract-icons";
import { Button } from "@plane/propel/button";
import { Header, Row } from "@plane/ui";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { useResource, shortDate } from "./api";
import type { Work, WorkItem } from "./api";
import { ClientPriority, ClientStateIcon } from "./work-icons";
import { ClientWorkToolbar } from "./work-toolbar";
import { readWorkView, isOverdue, groupWorkItems, views } from "./work-view";

export { ClientPriority, ClientStateIcon } from "./work-icons";

export function ClientWorkList({
  slug,
  suffix,
  requests,
  preview,
  projectName,
}: {
  slug: string;
  suffix: string;
  requests: boolean;
  preview: boolean;
  projectName: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();
  const view = readWorkView(location.search);
  const [search, setSearch] = useState(view.query);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => setSearch(view.query), [view.query]);
  const update = useCallback(
    (changes: Record<string, string>, replace = false) =>
      setUrlParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (Object.keys(changes).some((key) => ["q", "group", "priority", "view", "sort"].includes(key)))
            next.delete("page");
          Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
          return next;
        },
        { replace, preventScrollReset: true, flushSync: true }
      ),
    [setUrlParams]
  );
  useEffect(() => {
    if (search.trim() === view.query) return;
    const timer = window.setTimeout(() => update({ q: search.trim() }, true), 250);
    return () => window.clearTimeout(timer);
  }, [search, view.query, update]);
  const params = new URLSearchParams(suffix);
  if (requests) params.set("requests", "1");
  if (view.query) params.set("search", view.query);
  if (view.group) params.set("group", view.group);
  if (view.priority) params.set("priority", view.priority);
  params.set("view", view.view);
  params.set("sort", view.sort);
  params.set("offset", String(view.offset));
  const { data, error, reload, loading } = useResource<Work>(`${slug}/work/?${params}`, {
    retainDataFor: `${slug}:${preview}:${requests}`,
  });
  const sections = groupWorkItems(data?.results || [], view.grouped || view.board);
  const filtered = !!(view.query || view.group || view.priority);
  const clear = () => {
    setSearch("");
    update({ q: "", group: "", priority: "" });
  };
  const detailParams = new URLSearchParams(urlParams);
  if (requests) detailParams.set("source", "requests");
  else detailParams.delete("source");
  const querySuffix = detailParams.size ? `?${detailParams}` : "";
  const returnTo = `/client/${slug}/${requests ? "requests" : "work"}${location.search}`;
  const orderedIds = sections.flatMap((section) => section.items.map((item) => item.id));
  return (
    <>
      <Header className="client-page-header h-12 border-b border-subtle px-page-x">
        <Header.LeftItem className="min-w-0 flex-nowrap gap-3">
          <span className="hidden max-w-40 truncate text-13 text-secondary xl:block">{projectName}</span>
          <ChevronRight size={14} className="hidden shrink-0 text-tertiary xl:block" />
          <h1 className="flex items-center gap-2 text-14 font-medium whitespace-nowrap">
            {requests ? (
              <IntakeIcon className="size-4 text-secondary" />
            ) : (
              <WorkItemsIcon className="size-4 text-secondary" />
            )}
            {requests ? "Requests" : "Work items"}
          </h1>
          <span className="client-work-count" aria-live="polite" aria-busy={loading}>
            {data?.count}
          </span>
        </Header.LeftItem>
        <Header.RightItem>
          {!preview && (
            <Button
              size="xl"
              onClick={() => navigate(`/client/${slug}/new${location.search}`, { state: { returnTo } })}
            >
              <Plus size={16} /> New request
            </Button>
          )}
        </Header.RightItem>
      </Header>
      <ClientWorkToolbar view={view} search={search} setSearch={setSearch} update={update} clear={clear} />
      <div className="client-work-results" aria-busy={loading}>
        <div className="client-work-progress" data-loading={loading || undefined} aria-hidden="true" />
        <span className="sr-only" role="status">
          {loading ? "Updating work items" : data ? `${data.count} work ${data.count === 1 ? "item" : "items"}` : ""}
        </span>
        {error ? (
          <div role="alert" className="client-work-empty">
            <h2>We couldn’t load your work</h2>
            <p>{error}</p>
            <Button variant="secondary" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <div className="flex h-48 items-center justify-center" aria-label="Loading work items">
            <LogoSpinner />
          </div>
        ) : !data.results.length ? (
          <div className="client-work-empty">
            <WorkItemsIcon className="mx-auto size-6 text-tertiary" />
            <h2>
              {filtered
                ? "No matching work items"
                : requests
                  ? "Start a conversation with your team"
                  : view.view !== "all"
                    ? `No ${views[view.view as keyof typeof views].toLowerCase()} work items`
                    : "Your shared work will appear here"}
            </h2>
            <p>
              {filtered
                ? "Try another state, priority or search term."
                : view.view !== "all"
                  ? "Other work items are available in All work."
                  : "Send a request with the context and timing your team needs."}
            </p>
            {filtered ? (
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            ) : view.view !== "all" ? (
              <Button variant="secondary" onClick={() => update({ view: "all" })}>
                View all work
              </Button>
            ) : (
              !preview && <Button onClick={() => navigate(`/client/${slug}/new`)}>New request</Button>
            )}
          </div>
        ) : (
          <div className={view.board ? "client-board" : "client-work-table"}>
            {!view.board && (
              <div className="client-work-columns" aria-hidden="true">
                <span className="client-work-id">ID</span>
                <span className="flex-1">Work item</span>
                <span className="client-work-metadata">
                  {!view.grouped && <span className="client-row-state">State</span>}
                  {view.showPriority && <span className="client-priority-column">Priority</span>}
                  {view.showDate && <span className="client-row-date">Due date</span>}
                </span>
              </div>
            )}
            {sections.map(({ key: g, group, label, items }) => {
              const closed = collapsed.includes(g);
              return (
                <section
                  key={g}
                  className={view.board ? "client-board-column" : "client-work-group"}
                  data-state={group}
                >
                  <Row className="client-group-heading">
                    <button
                      aria-expanded={!closed}
                      onClick={() => setCollapsed(closed ? collapsed.filter((k) => k !== g) : [...collapsed, g])}
                      className="flex w-full items-center gap-2 text-left text-13"
                    >
                      <ChevronDown className={`size-3.5 text-tertiary ${closed ? "-rotate-90" : ""}`} />
                      {g !== "all" && <ClientStateIcon group={group} />}
                      <span className="font-medium">{label}</span>
                      <span className="text-12 text-tertiary tabular-nums">{items.length}</span>
                    </button>
                  </Row>
                  {!closed &&
                    items.map((item) => (
                      <NativeWorkRow
                        key={item.id}
                        item={item}
                        board={view.board}
                        showPriority={view.showPriority}
                        showDate={view.showDate}
                        showState={!view.grouped && !view.board}
                        href={`/client/${slug}/work/${item.id}${querySuffix}`}
                        navigationState={{ returnTo, workIds: orderedIds }}
                      />
                    ))}
                </section>
              );
            })}
          </div>
        )}
      </div>
      {data && data.count > 100 && (
        <Row className="flex items-center justify-end gap-4 py-4 text-12">
          <Button
            variant="secondary"
            disabled={!view.offset}
            onClick={() => update({ page: String(view.offset / 100 - 1) })}
          >
            Previous
          </Button>
          <span>
            {view.offset + 1}–{Math.min(view.offset + 100, data.count)} of {data.count}
          </span>
          <Button
            variant="secondary"
            disabled={view.offset + 100 >= data.count}
            onClick={() => update({ page: String(view.offset / 100 + 1) })}
          >
            Next
          </Button>
        </Row>
      )}
    </>
  );
}
function NativeWorkRow({
  item,
  href,
  board,
  showDate,
  showPriority,
  showState,
  navigationState,
}: {
  item: WorkItem;
  href: string;
  board: boolean;
  showDate: boolean;
  showPriority: boolean;
  showState: boolean;
  navigationState: { returnTo: string; workIds: string[] };
}) {
  return (
    <Link to={href} state={navigationState} className={board ? "client-board-work" : "client-work-row"}>
      <span className="client-work-id">#{item.sequence}</span>
      {board && <span className="sr-only">{item.status}</span>}
      <span className="client-work-title">{item.name}</span>
      <span className="client-work-metadata">
        {showState && (
          <span className="client-row-state">
            <ClientStateIcon group={item.group} />
            {item.status}
          </span>
        )}
        {showPriority && (
          <span className="client-priority-column">
            <ClientPriority priority={item.priority} />
          </span>
        )}
        {showDate && (
          <span
            className={`client-row-date ${isOverdue(item) ? "is-overdue" : ""}`}
            title={item.due_date ? `${isOverdue(item) ? "Overdue · " : "Due "}${item.due_date}` : "No due date"}
          >
            <CalendarDays size={15} />
            {item.due_date ? shortDate(item.due_date) : "No date"}
            {isOverdue(item) && <span className="sr-only">Overdue</span>}
          </span>
        )}
      </span>
    </Link>
  );
}
