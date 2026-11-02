// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  BookOpen,
  ChevronRight,
  FileText,
  Inbox,
  LayoutList,
  LogOut,
  Menu,
  PanelsTopLeft,
  Paperclip,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@plane/propel/button";
import { Input } from "@plane/propel/input";
import { PlaneLogo, PriorityIcon, StateGroupIcon } from "@plane/propel/icons";
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { api, csrf, shortDate, useResource } from "./api";
import type { Doc, Session, Task, Work, WorkItem } from "./api";
import portalStyles from "./portal.css?url";
export const links = () => [{ rel: "stylesheet", href: portalStyles }];

export const meta = () => [{ title: "Refract — Your workspace" }];
const groups = ["triage", "backlog", "unstarted", "started", "completed", "cancelled"];
const groupNames: Record<string, string> = {
  triage: "New requests",
  backlog: "Backlog",
  unstarted: "To do",
  started: "In progress",
  completed: "Done",
  cancelled: "Cancelled",
};
function Status({ group }: { group: string }) {
  return (
    <StateGroupIcon
      stateGroup={
        (group === "triage" ? "backlog" : group) as "backlog" | "unstarted" | "started" | "completed" | "cancelled"
      }
    />
  );
}
function Message({ children }: { children: ReactNode }) {
  return (
    <div className="m-6 rounded-md border border-subtle-1 bg-layer-1 p-5 text-13 text-secondary" role="status">
      {children}
    </div>
  );
}
function ErrorMessage({ error }: { error: string }) {
  return (
    <div className="rounded-md border border-danger-strong p-3 text-13 text-danger-primary" role="alert">
      {error}
    </div>
  );
}
function Loading() {
  return (
    <div className="flex h-48 items-center justify-center" aria-label="Loading">
      <LogoSpinner />
    </div>
  );
}
function Html({ value }: { value: string }) {
  return <div className="client-rich-text" dangerouslySetInnerHTML={{ __html: value }} />;
}

function Login() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    csrf()
      .then(setToken)
      .catch((e: Error) => setError(e.message));
  }, []);
  const failed = new URLSearchParams(useLocation().search).has("error_code");
  return (
    <div className="client-portal flex min-h-screen flex-col bg-canvas p-8 text-primary">
      <div className="flex items-center gap-2">
        <PlaneLogo width={28} height={28} />
        <span className="text-20 font-semibold">Refract</span>
      </div>
      <div className="mx-auto my-auto w-full max-w-sm py-12">
        <h1 className="text-24 font-semibold">Welcome back</h1>
        <p className="mt-2 mb-7 text-14 text-secondary">Sign in to your client workspace.</p>
        {(error || failed) && (
          <ErrorMessage error={error || "We couldn’t sign you in. Check your email and password and try again."} />
        )}
        <form action="/auth/sign-in/" method="post" className="mt-4 space-y-4">
          <input type="hidden" name="csrfmiddlewaretoken" value={token} />
          <input type="hidden" name="next_path" value="/client/" />
          <label htmlFor="client-email" className="block text-13">
            Email
            <Input
              id="client-email"
              className="mt-2 w-full"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
            />
          </label>
          <label htmlFor="client-password" className="block text-13">
            Password
            <Input
              id="client-password"
              className="mt-2 w-full"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <Button type="submit" className="w-full" disabled={!token}>
            Sign in
          </Button>
        </form>
        <a href="/accounts/forgot-password/" className="mt-4 block text-center text-13 text-secondary underline">
          Forgot password?
        </a>
        <p className="mt-8 text-center text-12 text-tertiary">
          Access is by invitation. Contact your Refract team if you need help.
        </p>
      </div>
    </div>
  );
}
function SignOut() {
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="flex items-center gap-2 text-13 text-secondary hover:text-primary"
        onClick={async () => {
          try {
            await api("sign-out/", {});
            window.location.assign("/client/");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <LogOut size={15} />
        Sign out
      </button>
      {error && <ErrorMessage error={error} />}
    </>
  );
}

export default function ClientPortalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useResource<Session>("session/");
  const [mobileOpen, setMobileOpen] = useState(false);
  const parts = location.pathname.split("/").filter(Boolean);
  const slug = parts[1] || "";
  const section = parts[2] || "work";
  const resource = parts[3];
  const preview = new URLSearchParams(location.search).get("preview") === "1";
  const suffix = preview ? "?preview=1" : "";
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (session.data?.user && !slug && session.data.clients.length === 1)
      navigate(`/client/${session.data.clients[0].slug}/work`, { replace: true });
  }, [session.data, slug, navigate]);
  if (session.error)
    return (
      <Message>
        {session.error}{" "}
        <a href="/client/" className="underline">
          Try again
        </a>
      </Message>
    );
  if (!session.data) return <Loading />;
  if (!session.data.user) return <Login />;
  const { user, clients, managed } = session.data;
  const portal = (preview ? managed : clients).find((p) => p.slug === slug);
  const href = (part: string) => `/client/${slug}/${part}${suffix}`;
  if (!portal && slug && slug !== "manage")
    return (
      <Message>
        This workspace is unavailable.{" "}
        <Link to="/client/" className="underline">
          Back to your workspaces
        </Link>
      </Message>
    );
  return (
    <div className="client-portal flex h-screen flex-col bg-canvas text-primary">
      <header className="flex h-10 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button className="md:hidden" aria-label="Open navigation" onClick={() => setMobileOpen((v) => !v)}>
            <Menu size={18} />
          </button>
          <Link to="/client/" className="flex items-center gap-2">
            <PlaneLogo width={22} height={22} />
            <span className="text-14 font-semibold">Refract</span>
          </Link>
          {portal && (
            <>
              <span className="text-tertiary">/</span>
              <span className="text-13 text-secondary">{portal.name}</span>
            </>
          )}
        </div>
        <Link
          aria-label="Your account"
          to={portal ? href("account") : "/client/"}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-layer-2 text-12 font-medium"
        >
          {(user.name || user.email)[0].toUpperCase()}
        </Link>
      </header>
      <div className="relative mx-2 mb-2 flex min-h-0 flex-1 overflow-hidden rounded-md bg-surface-1">
        {mobileOpen && (
          <button
            className="absolute inset-0 z-20 bg-black/20 md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          aria-label="Client navigation"
          className={`${mobileOpen ? "flex" : "hidden"} absolute inset-y-0 left-0 z-30 w-[240px] shrink-0 flex-col border-r border-subtle-1 bg-surface-1 md:static md:flex`}
        >
          <div className="px-5 pt-5 pb-3 text-16 font-medium">{portal?.name || "Client workspaces"}</div>
          {portal ? (
            <>
              <div className="px-3 pb-5">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  prependIcon={<Plus />}
                  disabled={preview}
                  onClick={() => navigate(href("new"))}
                >
                  New request
                </Button>
              </div>
              <nav className="space-y-1 px-3">
                {[
                  ["work", "Work", LayoutList],
                  ["documents", "Documents", BookOpen],
                  ["requests", "Requests", Inbox],
                ].map(([path, title, Icon]) => {
                  const I = Icon as typeof Inbox;
                  return (
                    <Link
                      key={String(path)}
                      to={href(String(path))}
                      aria-current={section === path ? "page" : undefined}
                    >
                      <SidebarNavItem isActive={section === path}>
                        <span className="flex items-center gap-2 py-1 text-13">
                          <I size={16} />
                          {String(title)}
                        </span>
                      </SidebarNavItem>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto space-y-4 border-t border-subtle-1 p-4">
                <Link to={href("account")} className="flex items-center gap-2 text-13 text-secondary">
                  <UserRound size={15} />
                  My account
                </Link>
                <SignOut />
              </div>
            </>
          ) : (
            <div className="px-3">
              <Link to="/client/">
                <SidebarNavItem isActive>
                  <span className="py-1 text-13">Workspaces</span>
                </SidebarNavItem>
              </Link>
              <div className="mt-6 px-2">
                <SignOut />
              </div>
            </div>
          )}
        </aside>
        <main className="min-w-0 flex-1 overflow-auto">
          {preview && (
            <div className="flex items-center justify-between border-b border-subtle-1 bg-layer-1 px-6 py-2 text-12 text-secondary">
              <span>Client preview · read only</span>
              <Link to="/client/manage" className="underline">
                Back to sharing
              </Link>
            </div>
          )}
          {!portal ? (
            <WorkspacePicker session={session.data} reload={session.reload} manage={slug === "manage"} />
          ) : section === "account" ? (
            <div className="mx-auto max-w-3xl p-8">
              <h1 className="mb-8 text-24 font-medium">My account</h1>
              <dl className="space-y-5 text-14">
                <div>
                  <dt className="text-secondary">Name</dt>
                  <dd className="mt-1">{user.name}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Email</dt>
                  <dd className="mt-1">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Workspace</dt>
                  <dd className="mt-1">{portal.name}</dd>
                </div>
              </dl>
              <div className="mt-10">
                <SignOut />
              </div>
            </div>
          ) : section === "documents" ? (
            <Documents slug={slug} id={resource} suffix={suffix} />
          ) : section === "new" ? (
            <RequestForm slug={slug} preview={preview} />
          ) : resource ? (
            <TaskDetail slug={slug} id={resource} suffix={suffix} preview={preview} />
          ) : (
            <WorkList slug={slug} suffix={suffix} requests={section === "requests"} preview={preview} />
          )}
        </main>
      </div>
    </div>
  );
}

function WorkList({
  slug,
  suffix,
  requests,
  preview,
}: {
  slug: string;
  suffix: string;
  requests: boolean;
  preview: boolean;
}) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [board, setBoard] = useState(false);
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams(suffix);
  if (requests) params.set("requests", "1");
  if (search) params.set("search", search);
  if (group) params.set("group", group);
  params.set("offset", String(offset));
  const { data, error } = useResource<Work>(`${slug}/work/?${params}`);
  useEffect(() => setOffset(0), [search, group, requests]);
  return (
    <>
      <div className="flex h-14 items-center justify-between gap-3 border-b border-subtle-1 px-6">
        <h1 className="flex items-center gap-2 text-14 font-medium">
          {requests ? <Inbox size={17} /> : <LayoutList size={17} />}
          {requests ? "Requests" : "Work"}
          {data && <span className="text-12 text-tertiary">{data.count}</span>}
        </h1>
        <div className="flex items-center gap-3">
          {!requests && (
            <div className="hidden items-center rounded border border-subtle-1 sm:flex">
              <button
                aria-label="List view"
                aria-pressed={!board}
                className={`p-1.5 ${!board ? "bg-layer-2" : ""}`}
                onClick={() => setBoard(false)}
              >
                <LayoutList size={15} />
              </button>
              <button
                aria-label="Board view"
                aria-pressed={board}
                className={`p-1.5 ${board ? "bg-layer-2" : ""}`}
                onClick={() => setBoard(true)}
              >
                <PanelsTopLeft size={15} />
              </button>
            </div>
          )}
          {!preview && (
            <Link to={`/client/${slug}/new`}>
              <Button size="sm" prependIcon={<Plus />}>
                New request
              </Button>
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-subtle-1 px-6 py-3">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 text-tertiary" size={14} />
          <Input
            aria-label="Search work"
            placeholder="Search work..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 pl-8"
          />
        </div>
        <select
          aria-label="Filter by status"
          className="rounded border border-subtle-1 bg-canvas px-2 py-2 text-12 text-secondary"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          <option value="">All statuses</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {groupNames[g]}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <Message>{error}</Message>
      ) : !data ? (
        <Loading />
      ) : !data.results.length ? (
        <Message>
          {search || group
            ? "No work matches these filters."
            : requests
              ? "No requests yet. Send your team a request to get started."
              : "Your team hasn’t shared any work here yet."}
        </Message>
      ) : (
        <div className={board ? "flex min-h-[60vh] gap-5 overflow-x-auto p-6" : ""}>
          {groups
            .filter((g) => data.results.some((i) => i.group === g))
            .map((g) => (
              <section key={g} className={board ? "w-[290px] shrink-0" : ""}>
                <div
                  className={`flex items-center gap-2 bg-layer-1 px-6 py-3 text-13 font-medium ${board ? "mb-3 rounded-md px-3" : ""}`}
                >
                  <Status group={g} />
                  {groupNames[g]}
                  <span className="font-normal ml-1 text-12 text-tertiary">
                    {data.results.filter((i) => i.group === g).length}
                  </span>
                </div>
                {data.results
                  .filter((i) => i.group === g)
                  .map((item) => (
                    <WorkRow
                      key={item.id}
                      item={item}
                      board={board}
                      href={`/client/${slug}/work/${item.id}${suffix}`}
                    />
                  ))}
              </section>
            ))}
        </div>
      )}
      {data && data.count > 100 && (
        <div className="flex items-center justify-end gap-4 p-5 text-12">
          <Button variant="secondary" size="sm" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 100))}>
            Previous
          </Button>
          <span>
            {offset + 1}–{Math.min(offset + 100, data.count)} of {data.count}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={offset + 100 >= data.count}
            onClick={() => setOffset(offset + 100)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
function WorkRow({ item, href, board }: { item: WorkItem; href: string; board: boolean }) {
  return (
    <Link
      to={href}
      className={
        board
          ? "mb-3 block rounded-md border border-subtle-1 bg-canvas p-3 hover:bg-layer-1"
          : "flex min-h-12 items-center gap-3 border-b border-subtle-1 px-6 py-3 hover:bg-layer-1"
      }
    >
      <span className={`flex items-center gap-2 text-12 text-tertiary ${board ? "mb-2" : ""}`}>
        <PriorityIcon priority={item.priority} />
        <span>#{item.sequence}</span>
      </span>
      <span className={board ? "line-clamp-2 text-13 font-medium" : "min-w-0 flex-1 truncate text-13"}>
        {item.name}
      </span>
      <span className={`flex items-center gap-3 text-12 text-secondary ${board ? "mt-4 justify-between" : ""}`}>
        <span className={board ? "" : "hidden lg:inline"}>{item.status}</span>
        {item.due_date && (
          <span className="rounded border border-subtle-1 px-1.5 py-0.5 whitespace-nowrap">
            {shortDate(item.due_date)}
          </span>
        )}
      </span>
    </Link>
  );
}
function Documents({ slug, id, suffix }: { slug: string; id?: string; suffix: string }) {
  const list = useResource<{ results: Doc[] }>(id ? null : `${slug}/documents/${suffix}`);
  const detail = useResource<Doc>(id ? `${slug}/documents/${id}/${suffix}` : null);
  const error = list.error || detail.error;
  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-subtle-1 px-6 text-14">
        <Link to={`/client/${slug}/documents${suffix}`} className="flex items-center gap-2">
          <BookOpen size={17} />
          Documents
        </Link>
        {id && (
          <>
            <ChevronRight size={14} />
            <span className="truncate text-secondary">{detail.data?.name || "Document"}</span>
          </>
        )}
      </div>
      {error ? (
        <Message>{error}</Message>
      ) : id ? (
        !detail.data ? (
          <Loading />
        ) : (
          <article className="mx-auto max-w-4xl px-6 py-12 sm:px-12">
            <FileText size={32} className="mb-5 text-tertiary" />
            <h1 className="text-30 mb-3 font-semibold">{detail.data.name}</h1>
            <p className="mb-10 text-12 text-tertiary">Updated {shortDate(detail.data.updated_at)}</p>
            <Html value={detail.data.description_html || ""} />
          </article>
        )
      ) : !list.data ? (
        <Loading />
      ) : !list.data.results.length ? (
        <Message>Your team hasn’t shared any documents yet.</Message>
      ) : (
        <div className="p-6">
          <div className="mb-3 grid grid-cols-[1fr_auto] border-b border-subtle-1 px-3 pb-3 text-12 text-tertiary">
            <span>Name</span>
            <span>Updated</span>
          </div>
          {list.data.results.map((doc) => (
            <Link
              key={doc.id}
              className="flex items-center gap-3 rounded-md px-3 py-4 hover:bg-layer-1"
              to={`/client/${slug}/documents/${doc.id}${suffix}`}
            >
              <FileText size={18} className="text-tertiary" />
              <span className="min-w-0 flex-1 truncate text-14">{doc.name}</span>
              <span className="text-12 text-tertiary">{shortDate(doc.updated_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function TaskDetail({ slug, id, suffix, preview }: { slug: string; id: string; suffix: string; preview: boolean }) {
  const { data, error, reload } = useResource<Task>(`${slug}/work/${id}/${suffix}`);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const operation = useRef(crypto.randomUUID());
  const fileOperation = useRef(crypto.randomUUID());
  useEffect(() => {
    setBody("");
    setFailure("");
    operation.current = crypto.randomUUID();
  }, [id]);
  async function reply(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    try {
      await api(`${slug}/work/${id}/`, { body, operation_id: operation.current });
      setBody("");
      operation.current = crypto.randomUUID();
      reload();
    } catch (caught) {
      setFailure((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error) return <Message>{error}</Message>;
  if (!data) return <Loading />;
  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-subtle-1 px-6 text-13">
        <Link to={`/client/${slug}/work${suffix}`} className="text-secondary">
          Work
        </Link>
        <ChevronRight size={14} />
        <span>#{data.sequence}</span>
      </div>
      <div className="flex flex-col-reverse lg:flex-row">
        <article className="min-w-0 flex-1 px-6 py-9 sm:px-10">
          <h1 className="mb-7 max-w-3xl text-24 font-semibold">{data.name}</h1>
          <Html value={data.description_html} />
          <section className="mt-10 border-t border-subtle-1 pt-6">
            <h2 className="mb-4 text-14 font-medium">Attachments</h2>
            {data.files.length ? (
              <div className="space-y-2">
                {data.files.map((f) => (
                  <a
                    key={f.id}
                    href={`${f.url}${suffix}`}
                    className="flex w-fit max-w-full items-center gap-2 rounded border border-subtle-1 px-3 py-2 text-13"
                  >
                    <Paperclip size={14} />
                    <span className="truncate">{f.name}</span>
                    <span className="text-11 text-tertiary">{Math.ceil(f.size / 1024)} KB</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-13 text-tertiary">No attachments</p>
            )}
            {!preview && (
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-12 text-secondary">
                <Plus size={14} />
                Add attachment<span className="text-tertiary">· up to 10 MB</span>
                <input
                  aria-label="Add attachment"
                  type="file"
                  className="sr-only"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      setFailure("Choose a file of up to 10 MB.");
                      return;
                    }
                    setBusy(true);
                    setFailure("");
                    const form = new FormData();
                    form.append("file", file);
                    form.append("operation_id", fileOperation.current);
                    try {
                      await api(`${slug}/work/${id}/files/`, form);
                      fileOperation.current = crypto.randomUUID();
                      reload();
                    } catch (err) {
                      setFailure((err as Error).message);
                    } finally {
                      setBusy(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            )}
          </section>
          <section className="mt-9 border-t border-subtle-1 pt-6">
            <h2 className="mb-5 text-14 font-medium">Conversation</h2>
            {data.comments.length ? (
              data.comments.map((c) => (
                <div key={c.id} className="mb-6 flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-layer-2 text-11">
                    {c.author[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-3 text-12">
                      <span className="font-medium">{c.author}</span>
                      <time className="text-tertiary">{shortDate(c.created_at)}</time>
                    </div>
                    <Html value={c.html} />
                  </div>
                </div>
              ))
            ) : (
              <p className="mb-5 text-13 text-tertiary">No messages yet.</p>
            )}
            {failure && <ErrorMessage error={failure} />}{" "}
            {!preview && (
              <form onSubmit={reply} className="mt-4 rounded-md border border-subtle-1">
                <textarea
                  aria-label="Reply to your team"
                  placeholder="Write a reply..."
                  required
                  maxLength={20000}
                  rows={4}
                  className="w-full resize-y bg-transparent p-4 text-13 outline-none"
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    operation.current = crypto.randomUUID();
                  }}
                />
                <div className="flex items-center justify-between border-t border-subtle-1 px-3 py-2">
                  <span className="text-11 text-tertiary">Shared with your Refract team</span>
                  <Button type="submit" size="sm" disabled={busy || !body.trim()}>
                    {busy ? "Saving..." : "Send reply"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </article>
        <aside className="w-full shrink-0 border-b border-subtle-1 p-6 lg:min-h-[calc(100vh-104px)] lg:w-64 lg:border-b-0 lg:border-l">
          <h2 className="mb-5 text-13 font-medium">Properties</h2>
          <dl className="space-y-5 text-12">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-secondary">Status</dt>
              <dd className="flex items-center gap-2">
                <Status group={data.group} />
                {data.status}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-secondary">Priority</dt>
              <dd className="flex items-center gap-2 capitalize">
                <PriorityIcon priority={data.priority} />
                {data.priority}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-secondary">Due date</dt>
              <dd>{shortDate(data.due_date)}</dd>
            </div>
            {data.request_status && (
              <div className="flex items-center justify-between">
                <dt className="text-secondary">Request</dt>
                <dd>{data.request_status}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </>
  );
}

function RequestForm({ slug, preview }: { slug: string; preview: boolean }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(crypto.randomUUID());
  if (preview) return <Message>Client preview is read only.</Message>;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: string }>(`${slug}/work/`, { ...data, operation_id: operation.current });
      navigate(`/client/${slug}/work/${result.id}`);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-subtle-1 px-6 text-14">
        <h1>New request</h1>
        <Link to={`/client/${slug}/requests`} aria-label="Close request">
          <X size={18} />
        </Link>
      </div>
      <form
        className="mx-auto max-w-3xl space-y-6 p-6 sm:p-10"
        onSubmit={submit}
        onChange={() => {
          operation.current = crypto.randomUUID();
        }}
      >
        <div>
          <h2 className="text-24 font-medium">What do you need?</h2>
          <p className="mt-2 text-13 text-secondary">
            Send a request to your Refract team. You can track it and add files once it’s submitted.
          </p>
        </div>
        {error && <ErrorMessage error={error} />}
        <label htmlFor="request-title" className="block text-13">
          Title
          <Input
            id="request-title"
            name="name"
            placeholder="A short description of the request"
            maxLength={255}
            required
            className="mt-2 w-full"
          />
        </label>
        <label className="block text-13">
          Details
          <textarea
            name="description"
            placeholder="Tell us what you’re looking for, and anything we should know."
            maxLength={20000}
            required
            rows={7}
            className="mt-2 w-full rounded-md border border-subtle-1 bg-layer-1 p-3 text-13 outline-none focus:border-accent-strong"
          />
        </label>
        <div className="flex flex-wrap gap-6">
          <label className="text-13">
            Priority
            <select
              name="priority"
              className="mt-2 block rounded-md border border-subtle-1 bg-canvas px-3 py-2 text-13"
            >
              <option value="none">No priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label htmlFor="request-date" className="text-13">
            Wanted by
            <Input id="request-date" type="date" name="due_date" className="mt-2" />
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate(`/client/${slug}/requests`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      </form>
    </>
  );
}

function WorkspacePicker({ session, reload, manage }: { session: Session; reload: () => void; manage: boolean }) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-10">
      <h1 className="text-24 font-medium">{manage ? "Client sharing" : "Your workspaces"}</h1>
      <p className="mt-2 mb-8 text-13 text-secondary">
        {manage
          ? "Choose the documents and people with access."
          : "Work, documents and conversations with your Refract team."}
      </p>
      {session.clients.map((p) => (
        <Link
          to={`/client/${p.slug}/work`}
          key={p.slug}
          className="mb-3 flex items-center justify-between rounded-md border border-subtle-1 p-4 text-14"
        >
          {p.name}
          <ChevronRight size={16} />
        </Link>
      ))}
      {!!session.managed.length && (
        <section>
          <h2 className="mt-8 mb-3 text-14 font-medium">Manage clients</h2>
          {session.managed.map((p) => (
            <div
              key={p.slug}
              className="mb-3 flex flex-wrap items-center gap-4 rounded-md border border-subtle-1 p-4 text-13"
            >
              <span className="flex-1 font-medium">{p.name}</span>
              <Link to={`/client/${p.slug}/work?preview=1`} className="text-secondary underline">
                View as client
              </Link>
              <Button size="sm" variant="secondary" onClick={() => setSelected(selected === p.slug ? "" : p.slug)}>
                Sharing
              </Button>
            </div>
          ))}
          {selected && <ManageClient slug={selected} />}
        </section>
      )}
      {!session.clients.length && !session.managed.length && !session.projects?.length && (
        <Message>Your account has no active client workspace. Contact your Refract team for access.</Message>
      )}
      {!!session.projects?.length && (
        <details className="mt-8 rounded-md border border-subtle-1 p-4">
          <summary className="cursor-pointer text-13 font-medium">Set up a client workspace</summary>
          <form
            className="mt-5 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              setError("");
              try {
                await api("manage/", form);
                reload();
              } catch (caught) {
                setError((caught as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <ErrorMessage error={error} />}
            <label className="block text-13">
              Project
              <select
                name="project_id"
                required
                className="mt-2 block w-full rounded border border-subtle-1 bg-canvas p-2"
              >
                {session.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="new-client-name" className="block text-13">
              Client name
              <Input id="new-client-name" className="mt-2 w-full" name="name" required maxLength={120} />
            </label>
            <label htmlFor="new-client-slug" className="block text-13">
              Address
              <Input
                id="new-client-slug"
                className="mt-2 w-full"
                name="slug"
                required
                pattern="[a-z0-9-]+"
                placeholder="client-name"
                maxLength={80}
              />
            </label>
            <p className="text-12 text-secondary">
              Tasks carrying the Client label will be visible. Documents and people are selected separately.
            </p>
            <Button type="submit" disabled={busy}>
              Create client workspace
            </Button>
          </form>
        </details>
      )}
    </div>
  );
}
function ManageClient({ slug }: { slug: string }) {
  const { data, error, reload } = useResource<{
    documents: Doc[];
    people: { account_id: string; account__user__email: string; active: boolean }[];
    activity: { kind: string; created_at: string }[];
  }>(`manage/${slug}/`);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(body: Record<string, unknown>) {
    setFailure("");
    setBusy(true);
    try {
      await api(`manage/${slug}/`, body);
      reload();
    } catch (caught) {
      setFailure((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error) return <Message>{error}</Message>;
  if (!data) return <Loading />;
  return (
    <div className="my-5 rounded-md border border-subtle-1 p-5">
      <h3 className="mb-4 text-14 font-medium">Shared documents</h3>
      {failure && <ErrorMessage error={failure} />}
      <div className="space-y-3">
        {data.documents.map((d) => (
          <label key={d.id} className="flex items-center gap-3 text-13">
            <input
              type="checkbox"
              checked={d.shared}
              disabled={busy}
              onChange={(e) => void save({ action: "document", page_id: d.id, shared: e.target.checked })}
            />
            <FileText size={15} />
            {d.name}
          </label>
        ))}
        {!data.documents.length && <p className="text-13 text-tertiary">No eligible project documents.</p>}
      </div>
      <h3 className="mt-7 mb-4 text-14 font-medium">People</h3>
      {data.people.map((p) => (
        <div key={p.account_id} className="mb-3 flex items-center justify-between gap-3 text-12">
          <span>{p.account__user__email}</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void save({ action: "person", email: p.account__user__email, active: !p.active })}
          >
            {p.active ? "Remove access" : "Restore access"}
          </Button>
        </div>
      ))}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const email = new FormData(e.currentTarget).get("email");
          void save({ action: "person", email, active: true });
        }}
      >
        <Input
          aria-label="Existing client account email"
          type="email"
          name="email"
          required
          placeholder="Existing client account email"
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="sm" disabled={busy}>
          Add access
        </Button>
      </form>
      <p className="mt-3 text-12 text-tertiary">
        Only existing accounts without internal workspace access can be added here. This does not send an invitation.
      </p>
      <details className="mt-6 text-12">
        <summary className="cursor-pointer text-secondary">Recent activity</summary>
        {data.activity.map((a) => (
          <p key={`${a.kind}-${a.created_at}`} className="mt-2 text-tertiary">
            {a.kind} · {shortDate(a.created_at)}
          </p>
        ))}
      </details>
    </div>
  );
}
