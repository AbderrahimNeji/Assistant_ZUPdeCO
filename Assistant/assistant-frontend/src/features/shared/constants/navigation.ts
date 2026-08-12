import {
  BarChart3,
  FileText,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Primary authenticated navigation — Assistant, Documents, Benchmarks.
 * Settings remains a scaffold and is intentionally omitted.
 */
export const APP_NAVIGATION: NavigationItem[] = [
  {
    title: "Assistant",
    href: "/assistant",
    icon: MessageSquare,
  },
  {
    title: "Documents",
    href: "/documents",
    icon: FileText,
  },
  {
    title: "Benchmarks",
    href: "/benchmarks",
    icon: BarChart3,
  },
];
