/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export const buttonVariants = cva("rf-button disabled:pointer-events-none", {
  variants: {
    variant: {
      primary: "rf-button--primary",
      secondary: "rf-button--secondary",
      tertiary: "rf-button--tertiary",
      ghost: "rf-button--transparent",
      link: "rf-button--link",
      brand: "rf-button--brand",
      warning: "rf-button--warning",
      "error-fill": "rf-button--danger",
      "error-outline": "rf-button--danger-subtle",
    },
    size: {
      sm: "rf-button--xs",
      base: "rf-button--sm",
      lg: "rf-button--md",
      xl: "rf-button--lg",
    },
  },
  defaultVariants: { variant: "primary", size: "base" },
});

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    appendIcon?: React.ReactElement;
    loading?: boolean;
    prependIcon?: React.ReactElement;
  };

export type TButtonVariant = NonNullable<ButtonProps["variant"]>;
export type TButtonSize = NonNullable<ButtonProps["size"]>;

const buttonIconStyling: Record<TButtonSize, string> = {
  sm: "size-3.5",
  base: "size-3.5",
  lg: "size-4",
  xl: "size-4 ",
};

export function getIconStyling(size: TButtonSize): string {
  return buttonIconStyling[size];
}

export function getButtonStyling(variant: TButtonVariant, size: TButtonSize): string {
  return buttonVariants({ variant, size });
}
