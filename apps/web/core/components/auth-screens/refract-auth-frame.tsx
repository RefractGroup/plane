// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import type { ReactNode } from "react";
import { PlaneLogo } from "@plane/propel/icons";

export function RefractAuthArtwork() {
  return (
    <aside className="rf-auth-art">
      <span className="rf-auth-art-mark">
        <PlaneLogo width={28} height={28} />
        <span>Refract</span>
      </span>
      <div className="rf-auth-note">
        <span className="rf-auth-eyebrow">YOUR TEAM, IN SYNC</span>
        <h2>
          Good work.
          <br />
          Moving forward.
        </h2>
        <p>A shared workspace for your projects, feedback and the next step forward.</p>
        <span className="rf-auth-note-footer">
          <span>Refract client workspace</span>
          <span aria-hidden="true">↗</span>
        </span>
      </div>
    </aside>
  );
}

export function RefractAuthFrame({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="rf-auth-frame">
      <RefractAuthArtwork />
      <main className="rf-auth-main">
        <div className="rf-auth-brand">{header}</div>
        <div className="rf-auth-card">{children}</div>
        <p className="rf-auth-caption">A shared space for you and your Refract team.</p>
      </main>
    </div>
  );
}
