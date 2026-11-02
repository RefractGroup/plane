/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@plane/utils";

type Props = HTMLAttributes<HTMLDivElement> & {
  mode?: "side-peek" | "modal" | "full-screen";
  embedded?: boolean;
};

/** Shared frame for staff and client work-item peeks. Data and actions belong to the caller. */
export const WorkItemPeekFrame = forwardRef<HTMLDivElement, Props>(function WorkItemPeekFrame(
  { mode = "side-peek", embedded = false, className, style, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        embedded
          ? "h-full w-full"
          : "absolute z-[25] flex flex-col overflow-hidden rounded-sm border border-subtle bg-surface-1 transition-all duration-300",
        !embedded && {
          "top-0 right-0 bottom-0 w-full border-0 border-l md:w-[50%]": mode === "side-peek",
          "top-[8.33%] left-[8.33%] size-5/6": mode === "modal",
          "absolute inset-0 m-4": mode === "full-screen",
        },
        className
      )}
      style={{
        boxShadow:
          "0px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px 6px 12px 0px rgba(16, 24, 40, 0.12), 0px 1px 16px 0px rgba(16, 24, 40, 0.12)",
        ...style,
      }}
    />
  );
});
