// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Home,
  WorkItemsIcon,
  PageIcon,
  IntakeIcon,
  Search,
  Filter,
  CalendarDays,
  Flag,
  UserRound,
  ListLayoutIcon,
  BoardLayoutIcon,
  SlidersHorizontal,
  Plus,
  X,
  ArrowRight,
  Link2,
} from "./icons";

const icons = {
  Home,
  WorkItemsIcon,
  PageIcon,
  IntakeIcon,
  Search,
  Filter,
  CalendarDays,
  Flag,
  UserRound,
  ListLayoutIcon,
  BoardLayoutIcon,
  SlidersHorizontal,
  Plus,
  X,
  ArrowRight,
  Link2,
};
const meta: Meta = { title: "Refract/Iconography", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const InterfaceIcons: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-6 text-primary">
      {Object.entries(icons).map(([name, Icon]) => (
        <div key={name} className="flex items-center gap-4 rounded-md border border-subtle p-4">
          <Icon size={16} />
          <Icon size={18} />
          <span className="text-12">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const NavigationStates: Story = {
  render: () => (
    <div className="flex gap-6 text-primary">
      {Object.entries({ Home, WorkItemsIcon, PageIcon, IntakeIcon }).map(([name, Icon]) => (
        <div key={name} className="flex items-center gap-4 rounded-md border border-subtle p-4">
          <Icon size={18} weight="regular" />
          <Icon size={18} weight="fill" />
        </div>
      ))}
    </div>
  ),
};
