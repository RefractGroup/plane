// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Link2,
  LockKeyhole,
  Printer,
  Search,
  X,
} from "@plane/propel/refract-icons";
import { Header } from "@plane/ui";
import { Button } from "@plane/propel/button";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { shortDate, useResource } from "./api";
import type { Doc } from "./api";
import { selectDocuments } from "./document-view";

type Heading = { id: string; label: string; level: string };

function Reader({ document }: { document: Doc }) {
  const body = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState("");
  useEffect(() => {
    const nodes = Array.from(body.current?.querySelectorAll("h2,h3") || []);
    const sections = nodes.map((node, index) => {
      if (!node.id) node.id = "page-section-" + document.id + "-" + index;
      return { id: node.id, label: node.textContent || "Section", level: node.tagName.slice(1) };
    });
    setHeadings(sections);
    setActive("");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { root: body.current?.closest(".client-main"), rootMargin: "-5% 0px -70% 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [document.id, document.description_html]);
  return (
    <div className="client-reader">
      <article>
        <header className="client-reader-heading">
          <span className="client-document-icon">
            <FileText size={22} />
          </span>
          <h1>{document.name}</h1>
          <div className="client-reader-meta">
            <span className="client-status-pill">Shared page</span>
            <Clock3 size={12} />
            <time dateTime={document.updated_at}>Updated {shortDate(document.updated_at)}</time>
          </div>
        </header>
        {document.description_html ? (
          <div
            ref={body}
            className="client-rich-text"
            dangerouslySetInnerHTML={{ __html: document.description_html }}
          />
        ) : (
          <p className="text-13 text-secondary">This page has no content yet.</p>
        )}
      </article>
      <aside className="client-reader-rail">
        {!!headings.length && (
          <>
            <h2>ON THIS PAGE</h2>
            <nav aria-label="On this page">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  data-level={heading.level}
                  href={"#" + heading.id}
                  aria-current={active === heading.id ? "location" : undefined}
                  onClick={() => setActive(heading.id)}
                >
                  {heading.label}
                </a>
              ))}
            </nav>
          </>
        )}
        <div className="client-reader-source">
          <strong>Shared with your workspace</strong>
          <p>Your Refract team maintains this page. You’re viewing the latest shared version.</p>
        </div>
      </aside>
    </div>
  );
}

export function ClientDocuments({ slug, id, suffix }: { slug: string; id?: string; suffix: string }) {
  const list = useResource<{ results: Doc[] }>(id ? null : `${slug}/documents/${suffix}`);
  const detail = useResource<Doc>(id ? `${slug}/documents/${id}/${suffix}` : null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"updated" | "name">("updated");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => {
    setCopied(false);
    setCopyError("");
  }, [id]);
  const resource = id ? detail : list;
  const documents = selectDocuments(list.data?.results || [], query, sort);
  return (
    <>
      <Header className="client-page-header h-12 border-b border-subtle px-page-x">
        <Header.LeftItem className="min-w-0 flex-nowrap gap-2">
          <Link to={`/client/${slug}/documents${suffix}`} className="flex items-center gap-2 text-14 font-medium">
            {id ? <ArrowLeft size={15} /> : <FileText size={15} />}Pages
          </Link>
          {id && (
            <>
              <ChevronRight size={13} className="text-tertiary" />
              <span className="truncate text-13 text-secondary">{detail.data?.name || "Document"}</span>
            </>
          )}
        </Header.LeftItem>
        {id && detail.data && (
          <Header.RightItem>
            <Button variant="ghost" size="lg" onClick={() => window.print()}>
              <Printer size={14} />
              Print
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setCopyError("");
                } catch {
                  setCopyError("Couldn’t copy the link. Copy it from your address bar.");
                }
              }}
            >
              {copied ? <Check size={13} /> : <Link2 size={13} />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </Header.RightItem>
        )}
      </Header>
      {copyError && (
        <p role="alert" className="px-8 py-3 text-12 text-danger-primary">
          {copyError}
        </p>
      )}
      {resource.error ? (
        <div className="client-work-empty" role="alert">
          <h2>We couldn’t load this page</h2>
          <p>{resource.error}</p>
          <Button variant="secondary" onClick={resource.reload}>
            Try again
          </Button>
        </div>
      ) : !resource.data ? (
        <div className="flex h-48 items-center justify-center" aria-label="Loading pages">
          <LogoSpinner />
        </div>
      ) : id && detail.data ? (
        <Reader document={detail.data} />
      ) : (
        <div className="client-documents">
          <div className="client-documents-heading">
            <div>
              <h1>Project library</h1>
              <p>Briefs, plans and shared knowledge. The context behind your work.</p>
            </div>
          </div>
          <section className="client-panel" aria-label="Shared pages">
            <div className="client-library-toolbar">
              <label className="client-library-search">
                <Search size={15} />
                <input
                  aria-label="Search pages"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages…"
                />
                {query && (
                  <button aria-label="Clear page search" onClick={() => setQuery("")}>
                    <X size={13} />
                  </button>
                )}
              </label>
              <label className="flex items-center gap-2 text-12 text-secondary">
                Sort by
                <select
                  aria-label="Sort pages"
                  value={sort}
                  onChange={(e) => setSort(e.target.value === "name" ? "name" : "updated")}
                >
                  <option value="updated">Recently updated</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>
            <div className="client-panel-inset">
              <div className="client-document-columns" aria-hidden="true">
                <span>Page name</span>
                <span>Last updated</span>
                <span>Access</span>
                <span />
              </div>
              {documents.map((document) => (
                <Link
                  key={document.id}
                  className="client-document-row"
                  to={`/client/${slug}/documents/${document.id}${suffix}`}
                >
                  <span>
                    <span className="client-document-icon">
                      <FileText size={17} />
                    </span>
                    <span>
                      <strong>{document.name}</strong>
                      <small>Shared by your Refract team</small>
                    </span>
                  </span>
                  <time dateTime={document.updated_at}>{shortDate(document.updated_at)}</time>
                  <span className="flex items-center gap-1.5">
                    <LockKeyhole size={12} />
                    Read only
                  </span>
                  <ChevronRight size={14} className="text-tertiary" />
                </Link>
              ))}
              {!documents.length && (
                <div className="client-work-empty">
                  <FileText size={24} className="mx-auto text-tertiary" />
                  <h2>{query ? "No pages match your search" : "Your project library starts here"}</h2>
                  <p>
                    {query
                      ? "Try a different name or clear your search."
                      : "Your Refract team will share briefs, plans and documents here."}
                  </p>
                  {query && (
                    <Button variant="secondary" onClick={() => setQuery("")}>
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
          </section>
          <p className="client-library-note">
            <LockKeyhole size={12} />
            {list.data?.results.length || 0} shared pages · Available to your workspace
          </p>
        </div>
      )}
    </>
  );
}
