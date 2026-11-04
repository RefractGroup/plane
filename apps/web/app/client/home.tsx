// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  FileText,
  Home,
  Inbox,
  Plus,
  Plug,
} from "@plane/propel/refract-icons";
import { Header } from "@plane/ui";
import { PageIcon, WorkItemsIcon, CheckCircle } from "@plane/propel/refract-icons";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { ClientPriority, ClientStateIcon } from "./work-list";
import { shortDate, useResource } from "./api";
import { isOverdue } from "./work-view";
import type { Doc, WorkItem } from "./api";

type HomeData = {
  counts: { active: number; completed: number; requests: number; pages: number };
  work: WorkItem[];
  pages: Doc[];
  performance_panels: string[];
};

function PerformancePanel({ attribution }: { attribution: boolean }) {
  const [preview, setPreview] = useState(false);
  return (
    <section className="client-panel client-performance" aria-labelledby="performance-heading">
      <header className="client-panel-heading">
        <div className="flex items-center gap-2.5">
          <span className="client-icon-tile">
            <ChartNoAxesCombined size={17} />
          </span>
          <h3 id="performance-heading">{attribution ? "Performance & attribution" : "Website performance"}</h3>
          <span className="client-status-pill">{preview ? "Sample data" : "Not connected"}</span>
        </div>
        <button
          className="rf-button rf-button--transparent rf-button--lg"
          aria-expanded={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Close preview" : "Preview reporting"}
          <ArrowUpRight size={13} />
        </button>
      </header>
      {preview ? (
        <>
          <div className="client-performance-preview">
            <div className="client-performance-value">
              <span>Website visitors</span>
              <strong>12,480</strong>
              <span className="client-positive">
                ↑ 18.6% <span>vs previous period</span>
              </span>
              <p>
                Form conversion <b>2.8%</b>
              </p>
            </div>
            <div className="client-preview-chart">
              <svg
                viewBox="0 0 500 124"
                role="img"
                aria-label="Illustrative visitor trend, not connected analytics"
                preserveAspectRatio="none"
              >
                <path className="client-chart-grid" d="M0 20H500M0 60H500M0 100H500" />
                <path
                  className="client-chart-area"
                  d="M0 96L25 90L50 93L75 79L100 83L125 64L150 71L175 56L200 63L225 47L250 54L275 38L300 44L325 26L350 32L375 18L400 24L425 10L450 16L475 5L500 12V124H0Z"
                />
                <path
                  className="client-chart-line"
                  d="M0 96L25 90L50 93L75 79L100 83L125 64L150 71L175 56L200 63L225 47L250 54L275 38L300 44L325 26L350 32L375 18L400 24L425 10L450 16L475 5L500 12"
                />
              </svg>
              <div className="client-chart-axis">
                <span>Day 1</span>
                <span>Day 30</span>
              </div>
            </div>
            <div className="client-channel-list">
              {(
                [
                  ["Organic search", 58],
                  ["Direct", 27],
                  ["Referral", 15],
                ] as const
              ).map(([name, share]) => (
                <div key={name}>
                  <div>
                    <span>{name}</span>
                    <b>{share}%</b>
                  </div>
                  <span className="client-track">
                    <i style={{ width: share + "%" }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="client-panel-footnote">
            Illustrative data only. This preview shows the layout; it does not report your website’s performance.
          </p>
        </>
      ) : (
        <div className="client-performance-empty">
          <div className="client-report-placeholder" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <span className="client-icon-tile">
              <Plug size={17} />
            </span>
            <h4>Your reporting, in one place</h4>
            <p>Traffic, enquiries and attribution will appear here when your reporting source is connected.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function ClientHome({ slug, suffix, name }: { slug: string; suffix: string; name: string }) {
  const { data, error, reload } = useResource<HomeData>(slug + "/home/" + suffix);
  const location = useLocation();
  const href = (section: string, view?: string) =>
    "/client/" + slug + "/" + section + suffix + (view ? (suffix ? "&" : "?") + "view=" + view : "");
  const context = { returnTo: location.pathname + location.search };
  const hour = new Date().getHours();
  const preview = suffix.includes("preview=1");
  const nextDue = data?.work.find((item) => item.due_date);
  return (
    <>
      <Header className="client-page-header h-12 border-b border-subtle px-page-x">
        <Header.LeftItem>
          <h1 className="flex items-center gap-2 text-14 font-medium">
            <Home className="size-4 text-secondary" />
            Home
          </h1>
        </Header.LeftItem>
        <Header.RightItem>
          <span className="text-12 text-secondary">
            {new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date())}
          </span>
        </Header.RightItem>
      </Header>
      <div className="client-overview">
        <div className="client-home-greeting">
          <div>
            <h2 className="client-editorial">
              Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}
              {name ? ", " + name.split(" ")[0] : ""}.
            </h2>
            <p>Here’s where things stand with your project.</p>
          </div>
          {!preview && (
            <Link to={href("new")} state={context} className="rf-button rf-button--primary rf-button--lg">
              <Plus size={14} />
              New request
            </Link>
          )}
        </div>
        {error ? (
          <div role="alert" className="client-panel p-6 text-13">
            {error}{" "}
            <button className="underline" onClick={reload}>
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="flex h-48 items-center justify-center" aria-label="Loading Home">
            <LogoSpinner />
          </div>
        ) : (
          <>
            <section aria-label="Project overview" className="client-overview-metrics">
              <Link to={href("work", "active")} className="client-overview-metric">
                <div className="client-metric-label">
                  <span className="client-icon-tile">
                    <WorkItemsIcon size={18} />
                  </span>
                  Active work
                  <ArrowUpRight size={13} />
                </div>
                <div className="client-metric-value">
                  <strong>{data.counts.active}</strong>
                  <span>in progress & planned</span>
                </div>
                <div className="client-metric-inset">
                  <span className="client-dot" />
                  {nextDue ? "Next due " + shortDate(nextDue.due_date) : "No upcoming due dates"}
                  <ChevronRight size={13} />
                </div>
              </Link>
              <Link to={href("work", "completed")} className="client-overview-metric">
                <div className="client-metric-label">
                  <span className="client-icon-tile client-icon-positive">
                    <CheckCircle size={18} />
                  </span>
                  Completed
                  <ArrowUpRight size={13} />
                </div>
                <div className="client-metric-value">
                  <strong>{data.counts.completed}</strong>
                  <span>work items delivered</span>
                </div>
                <div className="client-metric-inset">
                  <span className="client-dot client-dot-positive" />
                  {data.counts.completed + data.counts.active} active & completed in total
                  <ChevronRight size={13} />
                </div>
              </Link>
              <Link to={href("requests")} className="client-overview-metric">
                <div className="client-metric-label">
                  <span className="client-icon-tile client-icon-warm">
                    <Inbox size={18} />
                  </span>
                  Requests
                  <ArrowUpRight size={13} />
                </div>
                <div className="client-metric-value">
                  <strong>{data.counts.requests}</strong>
                  <span>shared with your team</span>
                </div>
                <div className="client-metric-inset">
                  <span className="client-dot client-dot-warm" />
                  View requests & follow-ups
                  <ChevronRight size={13} />
                </div>
              </Link>
              <Link to={href("documents")} className="client-overview-metric">
                <div className="client-metric-label">
                  <span className="client-icon-tile">
                    <FileText size={18} />
                  </span>
                  Shared pages
                  <ArrowUpRight size={13} />
                </div>
                <div className="client-metric-value">
                  <strong>{data.counts.pages}</strong>
                  <span>briefs & resources</span>
                </div>
                <div className="client-metric-inset">
                  Browse your library <ChevronRight size={13} />
                </div>
              </Link>
            </section>
            <div className="client-home-layout">
              <section className="client-panel" aria-labelledby="active-work-heading">
                <header className="client-panel-heading">
                  <div>
                    <h3 id="active-work-heading">Next up</h3>
                    <p>Upcoming deadlines first</p>
                  </div>
                  <Link to={href("work", "active")} className="client-text-link">
                    View all work <ArrowUpRight size={13} />
                  </Link>
                </header>
                <div className="client-panel-inset client-home-work">
                  {!!data.work.length && (
                    <div className="client-home-work-columns" aria-hidden="true">
                      <span>Work item</span>
                      <span>Due date</span>
                    </div>
                  )}
                  {data.work.map((item) => (
                    <Link key={item.id} to={href("work/" + item.id)} state={context} className="client-home-work-row">
                      <span className="size-4 shrink-0">
                        <ClientStateIcon group={item.group} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="client-home-work-title">{item.name}</span>
                        <span className="client-home-work-meta">
                          #{item.sequence}
                          <span>·</span>
                          {item.status}
                        </span>
                      </span>
                      <ClientPriority priority={item.priority} />
                      <span className={"client-home-due " + (isOverdue(item) ? "is-overdue" : "")}>
                        <CalendarDays size={14} />
                        {item.due_date ? shortDate(item.due_date) : "No date"}
                        {isOverdue(item) && <span className="sr-only">Overdue</span>}
                      </span>
                      <ChevronRight size={13} className="client-row-arrow" />
                    </Link>
                  ))}
                  {!data.work.length && (
                    <p className="p-6 text-13 text-secondary">
                      You’re all caught up. Completed items are available in Work items.
                    </p>
                  )}
                </div>
              </section>
              <section className="client-panel" aria-labelledby="essentials-heading">
                <header className="client-panel-heading">
                  <div>
                    <h3 id="essentials-heading">Project essentials</h3>
                    <p>Shared by your Refract team</p>
                  </div>
                  <Link to={href("documents")} className="client-text-link">
                    All pages
                    <ArrowUpRight size={13} />
                  </Link>
                </header>
                <div className="client-panel-inset client-home-resources">
                  {data.pages.map((page) => (
                    <Link key={page.id} to={href("documents/" + page.id)} className="client-resource-row">
                      <span className="client-document-icon">
                        <PageIcon size={18} />
                      </span>
                      <span>
                        <strong>{page.name}</strong>
                        <small>Updated {shortDate(page.updated_at)}</small>
                      </span>
                      <ChevronRight size={13} />
                    </Link>
                  ))}
                  {!data.pages.length && (
                    <p className="p-5 text-13 text-secondary">Your shared briefs and documents will appear here.</p>
                  )}
                </div>
              </section>
            </div>
            {!!data.performance_panels.length && (
              <PerformancePanel attribution={data.performance_panels.includes("attribution")} />
            )}
          </>
        )}
      </div>
    </>
  );
}
