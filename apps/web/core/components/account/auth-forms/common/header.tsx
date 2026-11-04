/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export function AuthFormHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="rf-auth-heading">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
