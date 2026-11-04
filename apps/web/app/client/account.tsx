// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, ShieldCheck, Sun, UserRound } from "@plane/propel/refract-icons";
import { Header } from "@plane/ui";

export function ClientAccount({
  name,
  email,
  workspace,
  children,
}: {
  name: string;
  email: string;
  workspace: string;
  children: ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <Header className="client-page-header h-12 border-b border-subtle px-page-x">
        <Header.LeftItem>
          <h1 className="flex items-center gap-2 text-14 font-medium">
            <UserRound size={15} />
            My account
          </h1>
        </Header.LeftItem>
      </Header>
      <div className="client-account">
        <header className="client-account-heading">
          <span className="client-account-avatar">{(name || email)[0].toUpperCase()}</span>
          <div>
            <h2>{name || "Your account"}</h2>
            <p>{email}</p>
          </div>
          <span className="client-status-pill">Client workspace</span>
        </header>
        <section className="client-panel">
          <header className="client-panel-heading">
            <div>
              <h3>Profile & access</h3>
              <p>Your details for this workspace.</p>
            </div>
            <ShieldCheck size={17} className="text-tertiary" />
          </header>
          <dl className="client-panel-inset client-account-details">
            <div>
              <dt>Full name</dt>
              <dd>{name || "Not provided"}</dd>
            </div>
            <div>
              <dt>Email address</dt>
              <dd>{email}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>{workspace}</dd>
            </div>
          </dl>
          <p className="client-panel-footnote">Your Refract team manages workspace membership and access.</p>
        </section>
        <section className="client-panel mt-6">
          <header className="client-panel-heading">
            <div>
              <h3>Appearance</h3>
              <p>Choose how your workspace looks on this browser.</p>
            </div>
          </header>
          <div className="client-appearance" role="group" aria-label="Colour theme">
            {(
              [
                { value: "light", label: "Light", Icon: Sun },
                { value: "dark", label: "Dark", Icon: Moon },
                { value: "system", label: "System", Icon: Monitor },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                data-appearance={value}
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                <span className="client-theme-sample" aria-hidden="true">
                  <i />
                  <span>
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                <span className="client-theme-label">
                  <Icon size={14} />
                  {label}
                  {theme === value && <Check size={14} />}
                </span>
              </button>
            ))}
          </div>
        </section>
        <div className="client-account-session">
          <div>
            <strong>Current session</strong>
            <p>Signed in as {email}</p>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
