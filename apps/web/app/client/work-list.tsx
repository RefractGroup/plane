// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@plane/propel/button";
import { Badge } from "@plane/propel/badge";
import { Input } from "@plane/propel/input";
import { Menu } from "@plane/propel/menu";
import { IconButton } from "@plane/propel/icon-button";
import {
  WorkItemsIcon,
  IntakeIcon,
  ListLayoutIcon,
  BoardLayoutIcon,
  PriorityIcon,
  StateGroupIcon,
} from "@plane/propel/icons";
import { Header, Row } from "@plane/ui";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { useResource, shortDate } from "./api";
import type { Work, WorkItem } from "./api";

const groups = ["triage", "backlog", "unstarted", "started", "completed", "cancelled"];
const groupNames: Record<string, string> = {
  triage: "New requests",
  backlog: "Backlog",
  unstarted: "To do",
  started: "In progress",
  completed: "Done",
  cancelled: "Cancelled",
};
export function ClientStateIcon({ group }: { group: string }) {
  return (
    <StateGroupIcon
      stateGroup={
        (group === "triage" ? "backlog" : group) as "backlog" | "unstarted" | "started" | "completed" | "cancelled"
      }
    />
  );
}

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
  const query = new URLSearchParams(location.search).get("q") || "";
  const [search, setSearch] = useState(query);
  const [searchOpen, setSearchOpen] = useState(!!query);
  const requestedGroup = new URLSearchParams(location.search).get("group") || "";
  const [group, setGroup] = useState(groups.includes(requestedGroup) ? requestedGroup : "");
  useEffect(() => setGroup(groups.includes(requestedGroup) ? requestedGroup : ""), [requestedGroup]);
  const [board, setBoard] = useState(false);
  const [grouped, setGrouped] = useState(true);
  const [showPriority, setShowPriority] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    setSearch(query);
    setSearchOpen(!!query);
  }, [query]);
  useEffect(() => setOffset(0), [search, group, requests]);
  const params = new URLSearchParams(suffix);
  if (requests) params.set("requests", "1");
  if (search) params.set("search", search);
  if (group) params.set("group", group);
  params.set("offset", String(offset));
  const { data, error } = useResource<Work>(`${slug}/work/?${params}`);
  const sections = grouped ? groups.filter((g) => data?.results.some((i) => i.group === g)) : ["all"];
  const filterLabel = group ? groupNames[group] : "All states";
  return (
    <>
      <Header className="h-11 border-b border-subtle px-page-x">
        <Header.LeftItem className="min-w-0 flex-nowrap gap-3">
          <span className="hidden max-w-36 truncate text-13 text-secondary xl:block">{projectName}</span>
          <ChevronRight size={14} className="hidden shrink-0 text-tertiary xl:block" />
          <h1 className="flex items-center gap-2 text-14 font-medium whitespace-nowrap">
            {requests ? (
              <IntakeIcon className="size-4 text-secondary" />
            ) : (
              <WorkItemsIcon className="size-4 text-secondary" />
            )}
            {requests ? "Requests" : "Work items"}
          </h1>
          {data && (
            <Badge variant="brand" size="sm">
              {data.count}
            </Badge>
          )}
        </Header.LeftItem>
        <Header.RightItem className="shrink-0 gap-2">
          <Menu
            ariaLabel="Layout"
            label={board ? <BoardLayoutIcon className="size-4" /> : <ListLayoutIcon className="size-4" />}
            buttonClassName="h-7"
          >
            <Menu.MenuItem onClick={() => setBoard(false)}>
              <ListLayoutIcon className="size-4" /> List {!board && <Check className="ml-auto size-3.5" />}
            </Menu.MenuItem>
            <Menu.MenuItem onClick={() => setBoard(true)}>
              <BoardLayoutIcon className="size-4" /> Board {board && <Check className="ml-auto size-3.5" />}
            </Menu.MenuItem>
          </Menu>
          <Menu
            ariaLabel="Filter"
            label={<Filter className="size-4" />}
            noChevron
            buttonClassName={`h-7 ${group ? "text-accent-primary" : ""}`}
          >
            {["", ...groups].map((g) => (
              <Menu.MenuItem key={g} onClick={() => setGroup(g)}>
                {g ? <ClientStateIcon group={g} /> : <Circle size={14} />}
                {g ? groupNames[g] : "All states"}
                {group === g && <Check className="ml-auto size-3.5" />}
              </Menu.MenuItem>
            ))}
          </Menu>
          <Menu
            ariaLabel="Display"
            label={<SlidersHorizontal className="size-4" />}
            noChevron
            buttonClassName="h-7"
            closeOnSelect={false}
          >
            <Menu.MenuItem onClick={() => setGrouped(!grouped)}>
              Group by state {grouped && <Check className="ml-auto size-3.5" />}
            </Menu.MenuItem>
            <Menu.MenuItem onClick={() => setShowPriority(!showPriority)}>
              Priority {showPriority && <Check className="ml-auto size-3.5" />}
            </Menu.MenuItem>
            <Menu.MenuItem onClick={() => setShowDate(!showDate)}>
              Due date {showDate && <Check className="ml-auto size-3.5" />}
            </Menu.MenuItem>
          </Menu>
          <IconButton
            aria-label="Search work items"
            variant="secondary"
            size="base"
            icon={Search}
            onClick={() => setSearchOpen(!searchOpen)}
          />
          {!preview && (
            <Button size="lg" className="hidden sm:inline-flex" onClick={() => navigate(`/client/${slug}/new`)}>
              New request
            </Button>
          )}
        </Header.RightItem>
      </Header>
      {(searchOpen || group) && (
        <Row className="flex items-center gap-3 border-b border-subtle py-2">
          {searchOpen && (
            <Input
              aria-label="Search work"
              placeholder="Search work items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-56"
            />
          )}
          {group && (
            <button
              className="flex items-center gap-2 rounded border border-subtle px-2 py-1 text-12"
              onClick={() => setGroup("")}
            >
              {filterLabel}
              <X size={12} />
            </button>
          )}
        </Row>
      )}
      {error ? (
        <p role="alert" className="p-6 text-13 text-secondary">
          {error}
        </p>
      ) : !data ? (
        <div className="flex h-48 items-center justify-center" aria-label="Loading">
          <LogoSpinner />
        </div>
      ) : !data.results.length ? (
        <p className="p-8 text-13 text-tertiary">
          {search || group
            ? "No work items match these filters."
            : requests
              ? "No requests yet. Send your team a request to get started."
              : "Your team hasn’t shared any work items yet."}
        </p>
      ) : (
        <div className={board ? "flex min-h-full gap-3 overflow-x-auto px-4 pt-3 pb-6" : ""}>
          {sections.map((g) => {
            const items = data.results.filter((item) => g === "all" || item.group === g);
            const closed = collapsed.includes(g);
            return (
              <section key={g} className={board ? "w-80 shrink-0" : ""}>
                <Row
                  className={
                    board ? "mb-2 border-b border-subtle px-3 py-2" : "w-full border-b border-subtle py-1 pr-3"
                  }
                >
                  <button
                    aria-expanded={!closed}
                    onClick={() => setCollapsed(closed ? collapsed.filter((key) => key !== g) : [...collapsed, g])}
                    className="group/list-header flex w-full items-center gap-2 py-1.5 text-left"
                  >
                    {g === "all" ? (
                      <Circle className="size-3.5 fill-current text-tertiary" />
                    ) : (
                      <ClientStateIcon group={g} />
                    )}
                    <span className="truncate text-14 font-medium">
                      {g === "all" ? "All work items" : groupNames[g]}
                    </span>
                    <span className="pl-1 text-13 text-tertiary">{items.length}</span>
                    <ChevronDown
                      className={`ml-auto size-3.5 text-tertiary opacity-0 group-hover/list-header:opacity-100 ${closed ? "-rotate-90 opacity-100" : ""}`}
                    />
                  </button>
                </Row>
                {!closed &&
                  items.map((item) => (
                    <NativeWorkRow
                      key={item.id}
                      item={item}
                      board={board}
                      showPriority={showPriority}
                      showDate={showDate}
                      href={`/client/${slug}/work/${item.id}${suffix}`}
                    />
                  ))}
              </section>
            );
          })}
        </div>
      )}
      {data && data.count > 100 && (
        <Row className="flex items-center justify-end gap-4 py-4 text-12">
          <Button variant="secondary" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 100))}>
            Previous
          </Button>
          <span>
            {offset + 1}–{Math.min(offset + 100, data.count)} of {data.count}
          </span>
          <Button variant="secondary" disabled={offset + 100 >= data.count} onClick={() => setOffset(offset + 100)}>
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
}: {
  item: WorkItem;
  href: string;
  board: boolean;
  showDate: boolean;
  showPriority: boolean;
}) {
  const properties = (
    <div className="flex shrink-0 flex-wrap items-center gap-2 text-12 whitespace-nowrap text-secondary">
      <span className="inline-flex h-5 items-center gap-1.5 rounded-sm border border-subtle px-1.5">
        <ClientStateIcon group={item.group} />
        {item.status}
      </span>
      {showPriority && (
        <span
          title={`${item.priority} priority`}
          className="inline-flex h-5 items-center rounded-sm border border-subtle px-1.5"
        >
          <PriorityIcon priority={item.priority} />
        </span>
      )}
      {showDate && item.due_date && (
        <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-subtle px-1.5">
          <CalendarDays size={12} />
          {shortDate(item.due_date)}
        </span>
      )}
    </div>
  );
  if (board)
    return (
      <Link
        to={href}
        className="group/kanban-block mb-2 block w-full rounded-lg border border-subtle bg-layer-2 p-3 text-13 shadow-raised-100 transition-all hover:border-strong hover:shadow-raised-200"
      >
        <div className="space-y-2">
          <span className="text-12 text-tertiary">#{item.sequence}</span>
          <div className="line-clamp-2 text-body-sm-medium text-primary">{item.name}</div>
          <div className="pt-1.5">{properties}</div>
        </div>
      </Link>
    );
  return (
    <Link to={href} className="block w-full cursor-pointer">
      <Row className="group/list-block relative flex min-h-11 flex-col gap-3 border-b border-subtle bg-layer-transparent py-3 text-13 transition-colors hover:bg-layer-transparent-hover sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-0.5">
          <span className="size-4 shrink-0" />
          <p className="truncate text-body-xs-medium text-primary">{item.name}</p>
        </div>
        {properties}
      </Row>
    </Link>
  );
}
