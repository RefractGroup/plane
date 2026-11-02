/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 *
 * Modified for the Refract board: shows the Refract mark while loading.
 */

import { PlaneLogo } from "@plane/propel/icons";

export function LogoSpinner() {
  return (
    <div className="flex items-center justify-center">
      <PlaneLogo width="44" height="44" className="h-6 w-6 animate-pulse text-primary sm:h-11 sm:w-11" />
    </div>
  );
}
