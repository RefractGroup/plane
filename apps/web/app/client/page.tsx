// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Home,
  ChevronRight,
  ChevronDown,
  Globe,
  PanelLeftClose,
  MoveRight,
  MoveDiagonal,
  CalendarDays,
  Circle,
  FileText,
  LogOut,
  Menu,
  Paperclip,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Button } from "@plane/propel/button";
import { Input } from "@plane/propel/input";
import { PlaneLogo, PriorityIcon, WorkItemsIcon, PageIcon, IntakeIcon, AddWorkItemIcon } from "@plane/propel/icons";
import { Avatar } from "@plane/propel/avatar";
import { Menu as NativeMenu } from "@plane/propel/menu";
import { IconButton } from "@plane/propel/icon-button";
import { ModalCore } from "@plane/ui";
import { Dialog } from "@headlessui/react";
import { WorkItemPeekFrame } from "@/components/issues/peek-overview/frame";
import { SidebarAddButton } from "@/components/sidebar/add-button";
import { ClientHome } from "./home";
import { ClientWorkList, ClientStateIcon as Status } from "./work-list";
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { api, csrf, shortDate, useResource } from "./api";
import type { Doc, Session, Task } from "./api";
import portalStyles from "./portal.css?url";
export const links = () => [{ rel: "stylesheet", href: portalStyles }];

export const meta = () => [{ title: "Refract — Your workspace" }];
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectOpen, setProjectOpen] = useState(true);
  const parts = location.pathname.split("/").filter(Boolean);
  const slug = parts[1] || "";
  const section = parts[2] || "home";
  const resource = parts[3];
  const preview = new URLSearchParams(location.search).get("preview") === "1";
  const suffix = preview ? "?preview=1" : "";
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (session.data?.user && !slug && session.data.clients.length === 1)
      navigate(`/client/${session.data.clients[0].slug}/home`, { replace: true });
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
      <header className="z-[27] flex min-h-10 w-full shrink-0 items-center bg-canvas px-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button className="md:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu size={18} />
          </button>
          {!sidebarOpen && (
            <button className="hidden md:block" aria-label="Show sidebar" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
          )}
          <NativeMenu
            ariaLabel="Open workspace switcher"
            noBorder
            customButton={
              <span className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-accent-primary text-12 text-on-color">
                  R
                </span>
                <span className="text-14 font-medium">Refract</span>
                <ChevronDown className="size-3 text-tertiary" />
              </span>
            }
          >
            {(preview ? managed : clients).map((client) => (
              <NativeMenu.MenuItem key={client.slug} onClick={() => navigate(`/client/${client.slug}/home${suffix}`)}>
                <Globe size={14} />
                {client.name}
              </NativeMenu.MenuItem>
            ))}
            {!!managed.length && (
              <NativeMenu.MenuItem onClick={() => navigate("/client/manage")}>Client sharing</NativeMenu.MenuItem>
            )}
          </NativeMenu>
        </div>
        {portal && (
          <form
            role="search"
            className="hidden w-[min(30vw,360px)] shrink-0 sm:block"
            onSubmit={(event) => {
              event.preventDefault();
              const query = new FormData(event.currentTarget).get("q")?.toString() || "";
              navigate(`${href("work")}${suffix ? "&" : "?"}q=${encodeURIComponent(query)}`);
            }}
          >
            <div className="flex h-7 items-center gap-2 rounded-md border border-subtle bg-surface-1 px-3 text-tertiary">
              <Search size={14} />
              <input
                aria-label="Search shared work"
                name="q"
                placeholder="Search work items..."
                className="min-w-0 flex-1 bg-transparent text-13 outline-none"
              />
            </div>
          </form>
        )}
        <div className="flex flex-1 items-center justify-end">
          <NativeMenu
            ariaLabel="Your account"
            noBorder
            noChevron
            customButton={
              <span className="flex size-8 items-center justify-center">
                <Avatar
                  name={user.name}
                  fallbackText={(user.name || user.email)[0].toUpperCase()}
                  fallbackBackgroundColor="#348678"
                  fallbackTextColor="#ffffff"
                  size="md"
                />
              </span>
            }
          >
            <NativeMenu.MenuItem onClick={() => navigate(portal ? href("account") : "/client/")}>
              My account
            </NativeMenu.MenuItem>
            <NativeMenu.MenuItem
              onClick={async () => {
                await api("sign-out/", {});
                window.location.assign("/client/");
              }}
            >
              Sign out
            </NativeMenu.MenuItem>
          </NativeMenu>
        </div>
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
          className={`${mobileOpen ? "flex" : "hidden"} ${sidebarOpen ? "md:flex" : "md:hidden"} absolute inset-y-0 left-0 z-30 w-[250px] shrink-0 flex-col border-r border-subtle bg-surface-1 pt-3 md:static`}
        >
          <div className="flex flex-col gap-3 px-3">
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="pt-1 text-16 font-medium">Projects</span>
              <IconButton
                aria-label="Collapse sidebar"
                variant="ghost"
                size="base"
                icon={PanelLeftClose}
                onClick={() => {
                  setSidebarOpen(false);
                  setMobileOpen(false);
                }}
              />
            </div>
            {portal && (
              <SidebarAddButton
                label={
                  <span className="flex items-center gap-2">
                    <AddWorkItemIcon className="size-4" />
                    New request
                  </span>
                }
                disabled={preview}
                onClick={() => navigate(href("new"))}
              />
            )}
          </div>
          <div className="flex-1 overflow-auto px-3 pt-6">
            {portal && (
              <Link to={href("home")} aria-current={section === "home" ? "page" : undefined} className="mb-6 block">
                <SidebarNavItem isActive={section === "home"}>
                  <span className="flex items-center gap-2 text-13">
                    <Home className="size-4" />
                    Home
                  </span>
                </SidebarNavItem>
              </Link>
            )}
            <div className="mb-3 flex items-center justify-between px-2 text-13 font-medium text-tertiary">
              <span>Projects</span>
              <ChevronDown size={14} />
            </div>
            {portal ? (
              <>
                <button
                  aria-expanded={projectOpen}
                  onClick={() => setProjectOpen(!projectOpen)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-13 text-secondary hover:bg-layer-transparent-hover"
                >
                  <Globe className="size-4 shrink-0 text-accent-primary" />
                  <span className="flex-1 truncate">{portal.name}</span>
                  <ChevronDown className={`size-3 ${projectOpen ? "" : "-rotate-90"}`} />
                </button>
                {projectOpen && (
                  <nav className="ml-6 space-y-0.5 pt-1 pb-3">
                    {[
                      ["work", "Work items", WorkItemsIcon],
                      ["documents", "Pages", PageIcon],
                      ["requests", "Requests", IntakeIcon],
                    ].map(([path, title, Icon]) => {
                      const I = Icon as typeof WorkItemsIcon;
                      return (
                        <Link
                          key={String(path)}
                          to={href(String(path))}
                          aria-current={section === path ? "page" : undefined}
                        >
                          <SidebarNavItem isActive={section === path}>
                            <span className="flex items-center gap-2 text-12 leading-5">
                              <I className="size-3.5" />
                              {String(title)}
                            </span>
                          </SidebarNavItem>
                        </Link>
                      );
                    })}
                  </nav>
                )}
              </>
            ) : (
              <Link to="/client/">
                <SidebarNavItem isActive>
                  <span className="text-13">Client workspaces</span>
                </SidebarNavItem>
              </Link>
            )}
          </div>
        </aside>
        <main className="relative min-w-0 flex-1 overflow-auto">
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
          ) : section === "home" ? (
            <ClientHome slug={slug} suffix={suffix} name={user.name} />
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
          ) : (
            <ClientWorkList
              slug={slug}
              suffix={suffix}
              requests={section === "requests"}
              preview={preview}
              projectName={portal.name}
            />
          )}
        </main>
        {portal && section === "new" && (
          <ModalCore isOpen handleClose={() => navigate(href("requests"))}>
            <RequestForm slug={slug} preview={preview} />
          </ModalCore>
        )}
        {portal && section === "work" && resource && (
          <ClientTaskPeek slug={slug} id={resource} suffix={suffix} preview={preview} />
        )}
      </div>
    </div>
  );
}

function Documents({ slug, id, suffix }: { slug: string; id?: string; suffix: string }) {
  const list = useResource<{ results: Doc[] }>(id ? null : `${slug}/documents/${suffix}`);
  const detail = useResource<Doc>(id ? `${slug}/documents/${id}/${suffix}` : null);
  const error = list.error || detail.error;
  return (
    <>
      <div className="flex h-11 items-center gap-2 border-b border-subtle px-page-x text-14">
        <Link to={`/client/${slug}/documents${suffix}`} className="flex items-center gap-2">
          <PageIcon className="size-4" />
          Pages
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
        <div className="px-page-x py-4">
          <div className="mb-3 grid grid-cols-[1fr_auto] border-b border-subtle-1 px-3 pb-3 text-12 text-tertiary">
            <span>Name</span>
            <span>Updated</span>
          </div>
          {list.data.results.map((doc) => (
            <Link
              key={doc.id}
              className="flex min-h-11 items-center gap-3 border-b border-subtle px-3 py-3 hover:bg-layer-transparent-hover"
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

function ClientTaskPeek(props: { slug: string; id: string; suffix: string; preview: boolean }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus();
  }, []);
  const close = () => navigate(`/client/${props.slug}/work${props.suffix}`);
  return (
    <WorkItemPeekFrame
      ref={panel}
      mode={expanded ? "full-screen" : "side-peek"}
      role="dialog"
      aria-label="Work item details"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
    >
      <div className="flex shrink-0 items-center gap-4 p-4">
        <button aria-label="Close work item" onClick={close}>
          <MoveRight className="size-4 text-tertiary hover:text-secondary" />
        </button>
        <button
          aria-label={expanded ? "Return to side peek" : "Expand work item"}
          onClick={() => setExpanded(!expanded)}
        >
          <MoveDiagonal className="size-4 text-tertiary hover:text-secondary" />
        </button>
      </div>
      <div className="vertical-scrollbar scrollbar-md min-h-0 flex-1 overflow-y-auto">
        <TaskDetail {...props} />
      </div>
    </WorkItemPeekFrame>
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
      <article className="min-w-0 px-8 py-5">
        <p className="mb-2 text-12 text-tertiary">#{data.sequence}</p>
        <h1 className="mb-3 text-20 font-semibold">{data.name}</h1>
        <Html value={data.description_html} />
        <section className="mt-7 mb-8">
          <h2 className="mb-5 text-13 font-medium">Properties</h2>
          <dl className="space-y-5 text-13">
            <div className="grid grid-cols-[135px_1fr] items-center gap-0">
              <dt className="flex items-center gap-2 text-tertiary">
                <Circle size={15} />
                State
              </dt>
              <dd className="flex items-center gap-2">
                <Status group={data.group} />
                {data.status}
              </dd>
            </div>
            <div className="grid grid-cols-[135px_1fr] items-center gap-0">
              <dt className="flex items-center gap-2 text-tertiary">
                <PriorityIcon priority="low" />
                Priority
              </dt>
              <dd className="flex items-center gap-2 capitalize">
                <PriorityIcon priority={data.priority} />
                {data.priority}
              </dd>
            </div>
            <div className="grid grid-cols-[135px_1fr] items-center gap-0">
              <dt className="flex items-center gap-2 text-tertiary">
                <CalendarDays size={15} />
                Due date
              </dt>
              <dd>{shortDate(data.due_date)}</dd>
            </div>
            {data.request_status && (
              <div className="grid grid-cols-[135px_1fr] items-center gap-0">
                <dt className="text-secondary">Request</dt>
                <dd>{data.request_status}</dd>
              </div>
            )}
          </dl>
        </section>
        <section className="mt-6">
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
        <section className="mt-8 pt-2">
          <h2 className="mb-5 text-14 font-medium">Activity</h2>
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
                placeholder="Add comment"
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
                  {busy ? "Saving..." : "Comment"}
                </Button>
              </div>
            </form>
          )}
        </section>
      </article>
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
      <div className="flex h-11 items-center justify-between border-b border-subtle px-page-x text-14">
        <Dialog.Title>New request</Dialog.Title>
        <Link to={`/client/${slug}/requests`} aria-label="Close request">
          <X size={18} />
        </Link>
      </div>
      <form
        className="space-y-5 p-6"
        onSubmit={submit}
        onChange={() => {
          operation.current = crypto.randomUUID();
        }}
      >
        {error && <ErrorMessage error={error} />}
        <label htmlFor="request-title" className="block text-13">
          <span className="sr-only">Title</span>
          <Input
            id="request-title"
            name="name"
            placeholder="Request title"
            maxLength={255}
            required
            className="w-full border-0 bg-transparent px-0 text-20 font-medium shadow-none"
          />
        </label>
        <label className="block text-13">
          <span className="sr-only">Details</span>
          <textarea
            name="description"
            placeholder="Tell us what you’re looking for, and anything we should know."
            maxLength={20000}
            required
            rows={7}
            className="w-full resize-y bg-transparent text-14 outline-none"
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
          to={`/client/${p.slug}/home`}
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
              <Link to={`/client/${p.slug}/home?preview=1`} className="text-secondary underline">
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
    performance_panels: string[];
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
      <h3 className="mt-7 mb-2 text-14 font-medium">Home performance panels</h3>
      <p className="mb-4 text-12 text-tertiary">
        Choose what appears on this client’s Home. Data connections will be added later.
      </p>
      <div className="space-y-3">
        {[
          ["website", "Website performance"],
          ["attribution", "Performance attribution"],
        ].map(([id, title]) => (
          <label key={id} className="flex items-center gap-3 text-13">
            <input
              type="checkbox"
              checked={data.performance_panels.includes(id)}
              disabled={busy}
              onChange={(e) =>
                void save({
                  action: "home",
                  performance_panels: e.target.checked
                    ? [...data.performance_panels, id]
                    : data.performance_panels.filter((panel) => panel !== id),
                })
              }
            />
            {title}
          </label>
        ))}
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
