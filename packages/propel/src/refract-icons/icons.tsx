// Copyright (c) 2023-present Plane Software, Inc. and contributors
// SPDX-License-Identifier: AGPL-3.0-only
import { forwardRef } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { ArrowsInSimpleIcon } from "@phosphor-icons/react/dist/csr/ArrowsInSimple";
import { ArrowsOutSimpleIcon } from "@phosphor-icons/react/dist/csr/ArrowsOutSimple";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/csr/ArrowDown";
import { EqualsIcon } from "@phosphor-icons/react/dist/csr/Equals";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { CircleDashedIcon } from "@phosphor-icons/react/dist/csr/CircleDashed";
import { CircleHalfIcon } from "@phosphor-icons/react/dist/csr/CircleHalf";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { FunnelSimpleIcon } from "@phosphor-icons/react/dist/csr/FunnelSimple";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/dist/csr/GlobeHemisphereWest";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { KanbanIcon } from "@phosphor-icons/react/dist/csr/Kanban";
import { LinkSimpleIcon } from "@phosphor-icons/react/dist/csr/LinkSimple";
import { ListIcon } from "@phosphor-icons/react/dist/csr/List";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/csr/ListBullets";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/csr/LockSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { MinusIcon } from "@phosphor-icons/react/dist/csr/Minus";
import { MonitorIcon } from "@phosphor-icons/react/dist/csr/Monitor";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { PaperclipIcon } from "@phosphor-icons/react/dist/csr/Paperclip";
import { PlugsIcon } from "@phosphor-icons/react/dist/csr/Plugs";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { PrinterIcon } from "@phosphor-icons/react/dist/csr/Printer";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { SortAscendingIcon } from "@phosphor-icons/react/dist/csr/SortAscending";
import { StackSimpleIcon } from "@phosphor-icons/react/dist/csr/StackSimple";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { TrayIcon } from "@phosphor-icons/react/dist/csr/Tray";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";

export type { IconProps } from "@phosphor-icons/react";

/** Refract UI glyphs: one family, a 16px default, and decorative unless labelled. */
function refractIcon(Component: Icon, name: string) {
  const Glyph = forwardRef<SVGSVGElement, IconProps>(function RefractIcon(
    { size = 16, weight = "regular", className = "", ...props },
    ref
  ) {
    return (
      <Component
        ref={ref}
        size={size}
        weight={weight}
        className={`rf-icon shrink-0 align-middle ${className}`}
        aria-hidden={props.alt || props["aria-label"] || props["aria-labelledby"] ? undefined : true}
        focusable="false"
        {...props}
      />
    );
  });
  Glyph.displayName = name;
  return Glyph;
}

export const Home = refractIcon(HouseIcon, "Home");
export const WorkItemsIcon = refractIcon(StackSimpleIcon, "WorkItemsIcon");
export const PageIcon = refractIcon(FileTextIcon, "PageIcon");
export const IntakeIcon = refractIcon(TrayIcon, "IntakeIcon");
export const Inbox = refractIcon(TrayIcon, "Inbox");
export const Eye = refractIcon(EyeIcon, "Eye");
export const EyeOff = refractIcon(EyeSlashIcon, "EyeOff");
export const ArrowRight = refractIcon(ArrowRightIcon, "ArrowRight");
export const ArrowLeft = refractIcon(ArrowLeftIcon, "ArrowLeft");
export const ArrowUpRight = refractIcon(ArrowUpRightIcon, "ArrowUpRight");
export const ChevronRight = refractIcon(CaretRightIcon, "ChevronRight");
export const ChevronLeft = refractIcon(CaretLeftIcon, "ChevronLeft");
export const ChevronDown = refractIcon(CaretDownIcon, "ChevronDown");
export const Link2 = refractIcon(LinkSimpleIcon, "Link2");
export const Check = refractIcon(CheckIcon, "Check");
export const Globe = refractIcon(GlobeHemisphereWestIcon, "Globe");
export const PanelLeftClose = refractIcon(SidebarSimpleIcon, "PanelLeftClose");
export const Menu = refractIcon(ListIcon, "Menu");
export const MoveRight = refractIcon(ArrowRightIcon, "MoveRight");
export const MoveDiagonal = refractIcon(ArrowsOutSimpleIcon, "MoveDiagonal");
export const Collapse = refractIcon(ArrowsInSimpleIcon, "Collapse");
export const CalendarDays = refractIcon(CalendarBlankIcon, "CalendarDays");
export const Circle = refractIcon(CircleIcon, "Circle");
export const FileText = refractIcon(FileTextIcon, "FileText");
export const LogOut = refractIcon(SignOutIcon, "LogOut");
export const Paperclip = refractIcon(PaperclipIcon, "Paperclip");
export const Plus = refractIcon(PlusIcon, "Plus");
export const Search = refractIcon(MagnifyingGlassIcon, "Search");
export const UserRound = refractIcon(UserCircleIcon, "UserRound");
export const X = refractIcon(XIcon, "X");
export const ChartNoAxesCombined = refractIcon(ChartLineUpIcon, "ChartNoAxesCombined");
export const Plug = refractIcon(PlugsIcon, "Plug");
export const ArrowDownWideNarrow = refractIcon(SortAscendingIcon, "ArrowDownWideNarrow");
export const Filter = refractIcon(FunnelSimpleIcon, "Filter");
export const SlidersHorizontal = refractIcon(SlidersHorizontalIcon, "SlidersHorizontal");
export const ListLayoutIcon = refractIcon(ListBulletsIcon, "ListLayoutIcon");
export const BoardLayoutIcon = refractIcon(KanbanIcon, "BoardLayoutIcon");
export const Clock3 = refractIcon(ClockIcon, "Clock3");
export const LockKeyhole = refractIcon(LockSimpleIcon, "LockKeyhole");
export const Printer = refractIcon(PrinterIcon, "Printer");
export const Monitor = refractIcon(MonitorIcon, "Monitor");
export const Moon = refractIcon(MoonIcon, "Moon");
export const ShieldCheck = refractIcon(ShieldCheckIcon, "ShieldCheck");
export const Sun = refractIcon(SunIcon, "Sun");
export const Flag = refractIcon(FlagIcon, "Flag");
export const CheckCircle = refractIcon(CheckCircleIcon, "CheckCircle");
export const CircleDashed = refractIcon(CircleDashedIcon, "CircleDashed");
export const CircleHalf = refractIcon(CircleHalfIcon, "CircleHalf");
export const XCircle = refractIcon(XCircleIcon, "XCircle");
export const WarningCircle = refractIcon(WarningCircleIcon, "WarningCircle");
export const PriorityHigh = refractIcon(ArrowUpIcon, "PriorityHigh");
export const PriorityMedium = refractIcon(EqualsIcon, "PriorityMedium");
export const PriorityLow = refractIcon(ArrowDownIcon, "PriorityLow");
export const Minus = refractIcon(MinusIcon, "Minus");
