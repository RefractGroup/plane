/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 *
 * Modified for the Refract board: shows nothing. Upstream links to Plane's own terms and privacy
 * policy, which don't cover this self-hosted server.
 */
import type { EAuthModes } from "@plane/constants";

interface TermsAndConditionsProps {
  authType?: EAuthModes;
}

export function TermsAndConditions(_props: TermsAndConditionsProps) {
  return null;
}
