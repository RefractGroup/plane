/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 *
 * Modified for the Refract board: renders the Refract mark (from RefractGroup/refract-group).
 */

import * as React from "react";

import type { ISvgIcons } from "../type";

// The Refract mark is 17.355 by 15.1925, centred here in a square box.
export function PlaneLogo({ width = "52", height = "52", className, color = "currentColor" }: ISvgIcons) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 -1.08125 17.355 17.355"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Refract"
    >
      <path d="M10.7898 15.0351H16.9297C17.126 15.0351 17.2419 14.815 17.1306 14.6532L7.37068 0.458165C7.17348 0.171363 6.84761 0 6.4994 0H0.244378C0.0473659 0 -0.0683869 0.22133 0.0440779 0.382994L9.92181 14.5816C10.1194 14.8657 10.4436 15.0351 10.7898 15.0351Z" />
      <path
        transform="translate(0, 8.65)"
        d="M6.29855 0H0.243927C0.10921 0 0 0.10921 0 0.243927V6.29854C0 6.43326 0.10921 6.54247 0.243927 6.54247H6.29855C6.43327 6.54247 6.54247 6.43326 6.54247 6.29854V0.243927C6.54247 0.10921 6.43327 0 6.29855 0Z"
      />
      <path
        transform="translate(10.68668, 0)"
        d="M6.66829 3.33021C6.66829 1.49098 5.17554 0 3.33415 0C1.49275 0 0 1.49098 0 3.33021C0 5.16944 1.49275 6.66042 3.33415 6.66042C5.17554 6.66042 6.66829 5.16944 6.66829 3.33021Z"
      />
    </svg>
  );
}
