// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import { useState } from "react";
import { Menu } from "@plane/propel/menu";
import { Popover } from "@plane/propel/popover";
import {
  ArrowDownWideNarrow,
  BoardLayoutIcon,
  Check,
  ChevronDown,
  Circle,
  Flag,
  ListLayoutIcon,
  Search,
  SlidersHorizontal,
  X,
} from "@plane/propel/refract-icons";
import type { WorkItem } from "./api";
import { ClientPriorityIcon, ClientStateIcon } from "./work-icons";
import { groups, groupNames, priorities, priorityNames, readWorkView, sorts, views } from "./work-view";

type WorkView = ReturnType<typeof readWorkView>;
type Props = {
  view: WorkView;
  search: string;
  setSearch: (value: string) => void;
  update: (changes: Record<string, string>, replace?: boolean) => void;
  clear: () => void;
};

function WorkFilters({ view, update }: Pick<Props, "view" | "update">) {
  return (
    <>
      <Menu
        ariaLabel="Filter by state"
        noChevron
        label={
          <>
            <Circle />
            State
            <ChevronDown size={12} />
          </>
        }
        buttonClassName={`client-toolbar-button${view.group ? " client-toolbar-button-active" : ""}`}
        optionsClassName="client-menu client-work-filter-menu"
        maxHeight="lg"
      >
        {["", ...groups].map((group) => (
          <Menu.MenuItem
            key={group}
            onClick={() => update({ group })}
            className={view.group === group ? "client-work-filter-selected" : ""}
          >
            {group ? <ClientStateIcon group={group} /> : <Circle />}
            <span className="flex-1">{group ? groupNames[group] : "Any state"}</span>
            {view.group === group && <span className="sr-only">Selected</span>}
            <Check size={14} className={view.group === group ? "" : "invisible"} />
          </Menu.MenuItem>
        ))}
      </Menu>
      <Menu
        ariaLabel="Filter by priority"
        noChevron
        label={
          <>
            <Flag />
            Priority
            <ChevronDown size={12} />
          </>
        }
        buttonClassName={`client-toolbar-button${view.priority ? " client-toolbar-button-active" : ""}`}
        optionsClassName="client-menu client-work-filter-menu"
        maxHeight="lg"
      >
        {["", ...priorities].map((priority) => (
          <Menu.MenuItem
            key={priority}
            onClick={() => update({ priority })}
            className={view.priority === priority ? "client-work-filter-selected" : ""}
          >
            {priority ? <ClientPriorityIcon priority={priority as WorkItem["priority"]} /> : <Flag />}
            <span className="flex-1">{priority ? priorityNames[priority] : "Any priority"}</span>
            {view.priority === priority && <span className="sr-only">Selected</span>}
            <Check size={14} className={view.priority === priority ? "" : "invisible"} />
          </Menu.MenuItem>
        ))}
      </Menu>
    </>
  );
}

function WorkDisplay({ view, update }: Pick<Props, "view" | "update">) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Button className="client-toolbar-button client-toolbar-button-quiet">
        <SlidersHorizontal /> Display
      </Popover.Button>
      <Popover.Panel
        align="end"
        sideOffset={7}
        positionerClassName="z-50"
        className="client-work-popover client-display-popover"
        aria-label="Display options"
      >
        <header className="client-popover-header">
          <h2>Display</h2>
          <button className="client-icon-control" aria-label="Close display options" onClick={() => setOpen(false)}>
            <X />
          </button>
        </header>
        <div className="client-display-section">
          <label className="client-display-option">
            <span>Group by state</span>
            <input
              type="checkbox"
              role="switch"
              checked={view.grouped || view.board}
              disabled={view.board}
              onChange={(event) => update({ grouped: event.target.checked ? "" : "0" })}
            />
          </label>
          {view.board && <p className="client-display-note">Board columns are grouped by state.</p>}
        </div>
        <fieldset className="client-display-section">
          <legend>Properties</legend>
          <label className="client-display-option">
            <span>Priority</span>
            <input
              type="checkbox"
              role="switch"
              checked={view.showPriority}
              onChange={(event) => update({ priorityColumn: event.target.checked ? "" : "0" })}
            />
          </label>
          <label className="client-display-option">
            <span>Due date</span>
            <input
              type="checkbox"
              role="switch"
              checked={view.showDate}
              onChange={(event) => update({ dateColumn: event.target.checked ? "" : "0" })}
            />
          </label>
        </fieldset>
      </Popover.Panel>
    </Popover>
  );
}

export function ClientWorkToolbar({ view, search, setSearch, update, clear }: Props) {
  return (
    <>
      <div className="client-work-toolbar">
        <nav aria-label="Work views" className="client-view-tabs">
          {Object.entries(views).map(([key, label]) => (
            <button
              key={key}
              aria-current={view.view === key ? "page" : undefined}
              onClick={() => update({ view: key, group: "" })}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="client-view-controls">
          <div className="client-layout-switch" role="group" aria-label="Work layout">
            <button
              aria-label="List view"
              title="List view"
              aria-pressed={!view.board}
              onClick={() => update({ layout: "" })}
            >
              <ListLayoutIcon size={17} />
            </button>
            <button
              aria-label="Board view"
              title="Board view"
              aria-pressed={view.board}
              onClick={() => update({ layout: "board" })}
            >
              <BoardLayoutIcon size={17} />
            </button>
          </div>
          <WorkDisplay view={view} update={update} />
        </div>
      </div>
      <div className="client-work-searchbar">
        <form
          className="client-work-search"
          role="search"
          aria-label="Search this view"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: search.trim() }, true);
          }}
        >
          <Search />
          <input
            aria-label="Search work"
            placeholder="Search work items…"
            maxLength={200}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear work search"
              onClick={() => {
                setSearch("");
                update({ q: "" }, true);
              }}
            >
              <X size={14} />
            </button>
          )}
        </form>
        <WorkFilters view={view} update={update} />
        <div className="client-applied-filters">
          {view.group && (
            <button
              className="client-filter-chip"
              aria-label="Remove state filter"
              onClick={() => update({ group: "" })}
            >
              <ClientStateIcon group={view.group} />
              {groupNames[view.group]}
              <X size={12} />
            </button>
          )}
          {view.priority && (
            <button
              className="client-filter-chip"
              aria-label="Remove priority filter"
              onClick={() => update({ priority: "" })}
            >
              <ClientPriorityIcon priority={view.priority as WorkItem["priority"]} />
              {priorityNames[view.priority]}
              <X size={12} />
            </button>
          )}
          {(view.group || view.priority) && (
            <button className="client-clear-filters" onClick={clear}>
              Clear
            </button>
          )}
        </div>
        <Menu
          ariaLabel="Sort work items"
          noChevron
          label={
            <>
              <ArrowDownWideNarrow />
              {sorts[view.sort as keyof typeof sorts]}
              <ChevronDown size={12} />
            </>
          }
          buttonClassName="client-toolbar-button client-toolbar-button-quiet"
          optionsClassName="client-menu client-work-sort-menu"
          maxHeight="lg"
        >
          {Object.entries(sorts).map(([key, label]) => (
            <Menu.MenuItem key={key} onClick={() => update({ sort: key })}>
              <span className="flex-1">{label}</span>
              <Check size={15} className={view.sort === key ? "" : "invisible"} />
            </Menu.MenuItem>
          ))}
        </Menu>
      </div>
    </>
  );
}
