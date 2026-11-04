// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import {
  Circle,
  CircleDashed,
  CircleHalf,
  CheckCircle,
  XCircle,
  IntakeIcon,
  WarningCircle,
  PriorityHigh,
  PriorityMedium,
  PriorityLow,
  Minus,
} from "@plane/propel/refract-icons";
import type { WorkItem } from "./api";
import { priorityNames } from "./work-view";

export function ClientStateIcon({ group }: { group: string }) {
  const Icon =
    {
      triage: IntakeIcon,
      backlog: CircleDashed,
      unstarted: Circle,
      started: CircleHalf,
      completed: CheckCircle,
      cancelled: XCircle,
    }[group] || Circle;
  return (
    <Icon
      size={16}
      weight={group === "completed" || group === "started" ? "fill" : "regular"}
      className="client-state-icon"
      data-state={group}
    />
  );
}

export function ClientPriorityIcon({ priority }: { priority: WorkItem["priority"] }) {
  const Icon = {
    urgent: WarningCircle,
    high: PriorityHigh,
    medium: PriorityMedium,
    low: PriorityLow,
    none: Minus,
  }[priority];
  return <Icon size={16} className="client-priority-icon" data-priority={priority} />;
}

export function ClientPriority({ priority }: { priority: WorkItem["priority"] }) {
  return (
    <span
      className="client-priority"
      data-priority={priority}
      aria-label={priority === "none" ? "No priority" : priority + " priority"}
    >
      <ClientPriorityIcon priority={priority} />
      <span>{priorityNames[priority]}</span>
    </span>
  );
}
