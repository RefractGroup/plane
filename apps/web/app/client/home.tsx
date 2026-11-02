// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUpRight, ChartNoAxesCombined, Globe, Home } from "lucide-react";
import { TranslationProvider } from "@plane/i18n";
import { Header } from "@plane/ui";
import { PageIcon } from "@plane/propel/icons";
import { UserGreetingsView } from "@/components/home/user-greetings";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { ClientStateIcon } from "./work-list";
import { shortDate, useResource } from "./api";
import type { Doc, WorkItem } from "./api";

type HomeData = {
  counts: { active: number; completed: number; requests: number; pages: number };
  work: WorkItem[];
  pages: Doc[];
  performance_panels: string[];
};

function Widget({ title, link, children }: { title: string; link?: string; children: ReactNode }) {
  return (
    <section className="py-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-16 font-medium">{title}</h2>
        {link && (
          <Link to={link} className="flex items-center gap-1 text-12 text-secondary hover:text-primary">
            View all <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function ClientHome({ slug, suffix, name }: { slug: string; suffix: string; name: string }) {
  const { data, error, reload } = useResource<HomeData>(`${slug}/home/${suffix}`);
  const href = (section: string) => `/client/${slug}/${section}${suffix}`;
  return (
    <>
      <Header className="h-11 border-b border-subtle px-page-x">
        <Header.LeftItem>
          <h1 className="flex items-center gap-2 text-14 font-medium">
            <Home className="size-4 text-secondary" />
            Home
          </h1>
        </Header.LeftItem>
      </Header>
      <div className="mx-auto w-full max-w-[864px] px-5 pb-10 sm:px-8">
        <TranslationProvider>
          <UserGreetingsView user={{ first_name: name, last_name: "" }} />
        </TranslationProvider>
        {error ? (
          <div role="alert" className="py-8 text-13 text-secondary">
            {error}{" "}
            <button onClick={reload} className="underline">
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="flex h-48 items-center justify-center" aria-label="Loading Home">
            <LogoSpinner />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Widget title="Your workspace">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Active work", value: data.counts.active, path: "work" },
                  { label: "Completed", value: data.counts.completed, path: "work", query: "group=completed" },
                  { label: "Requests", value: data.counts.requests, path: "requests" },
                  { label: "Shared pages", value: data.counts.pages, path: "documents" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    to={`${href(item.path)}${item.query ? `${suffix ? "&" : "?"}${item.query}` : ""}`}
                    className="rounded-md border border-subtle p-4 hover:border-strong"
                  >
                    <div className="text-12 text-secondary">{item.label}</div>
                    <div className="mt-2 text-24 font-semibold tabular-nums">{item.value}</div>
                  </Link>
                ))}
              </div>
            </Widget>
            {!!data.performance_panels.length && (
              <Widget title="Performance">
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.performance_panels.map((panel) => {
                    const website = panel === "website";
                    const Icon = website ? Globe : ChartNoAxesCombined;
                    return (
                      <div
                        key={panel}
                        className={`rounded-md border border-subtle p-5 ${data.performance_panels.length === 1 ? "sm:col-span-2" : ""}`}
                      >
                        <div className="mb-5 flex items-center justify-between gap-2">
                          <Icon className="size-5 text-tertiary" />
                          <span className="text-11 text-tertiary">Not connected</span>
                        </div>
                        <h3 className="text-14 font-medium">
                          {website ? "Website performance" : "Performance attribution"}
                        </h3>
                        <p className="mt-2 text-13 leading-relaxed text-secondary">
                          {website
                            ? "Traffic, engagement and conversions will appear here once website reporting is connected."
                            : "See how channels contribute to enquiries and outcomes once reporting is connected."}
                        </p>
                        <p className="mt-5 border-t border-subtle pt-3 text-11 text-tertiary">
                          No reporting data connected yet
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Widget>
            )}
            <Widget title="Active work" link={href("work")}>
              <div className="divide-y divide-subtle">
                {data.work.map((item) => (
                  <Link
                    key={item.id}
                    to={href(`work/${item.id}`)}
                    className="flex items-center gap-3 py-3 text-13 hover:text-accent-primary"
                  >
                    <span className="size-4 shrink-0">
                      <ClientStateIcon group={item.group} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="hidden text-12 text-tertiary sm:inline">{item.status}</span>
                    <span className="w-16 shrink-0 text-right text-12 text-tertiary">{shortDate(item.due_date)}</span>
                  </Link>
                ))}
                {!data.work.length && (
                  <p className="py-5 text-13 text-secondary">
                    You’re all caught up. Shared active work will appear here.
                  </p>
                )}
              </div>
            </Widget>
            <Widget title="Shared pages" link={href("documents")}>
              <div className="divide-y divide-subtle">
                {data.pages.map((page) => (
                  <Link
                    key={page.id}
                    to={href(`documents/${page.id}`)}
                    className="flex items-center gap-3 py-3 text-13 hover:text-accent-primary"
                  >
                    <PageIcon className="size-4 shrink-0 text-tertiary" />
                    <span className="min-w-0 flex-1 truncate">{page.name}</span>
                    <span className="shrink-0 text-12 text-tertiary">{shortDate(page.updated_at)}</span>
                  </Link>
                ))}
                {!data.pages.length && (
                  <p className="py-5 text-13 text-secondary">Pages shared by your team will appear here.</p>
                )}
              </div>
            </Widget>
          </div>
        )}
      </div>
    </>
  );
}
