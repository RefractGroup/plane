/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";
// helpers
import { cn } from "../utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mode?: "primary" | "transparent" | "true-transparent";
  inputSize?: "xs" | "sm" | "md";
  hasError?: boolean;
  className?: string;
}

const Input = React.forwardRef(function Input(props: InputProps, ref: React.ForwardedRef<HTMLInputElement>) {
  const {
    id,
    type,
    name,
    mode = "primary",
    inputSize = "sm",
    hasError = false,
    className = "",
    autoComplete = "off",
    ...rest
  } = props;

  return (
    <input
      id={id}
      ref={ref}
      type={type}
      name={name}
      className={cn(
        "rf-field placeholder-tertiary block text-13",
        {
          border: mode === "primary",
          "rounded-sm border-none bg-transparent shadow-none ring-0 transition-all focus:ring-1 focus:ring-accent-strong":
            mode === "transparent",
          "rounded-sm border-none bg-transparent shadow-none ring-0": mode === "true-transparent",
          "border-danger-strong": hasError,
          "px-1.5 py-1": inputSize === "xs",
          "px-3 py-2": inputSize === "sm",
          "p-3": inputSize === "md",
        },
        className
      )}
      aria-invalid={hasError || undefined}
      autoComplete={autoComplete}
      {...rest}
    />
  );
});

Input.displayName = "form-input-field";

export { Input };
