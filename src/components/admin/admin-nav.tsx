// components/admin/admin-nav.tsx
import { LeadStatus } from "@prisma/client";

export type AdminNavItem = {
  title: string;
  href?: string;
  badge?: string;
  children?: { title: string; href: string; badge?: string }[];
};

export const adminNav: AdminNavItem[] = [
  {
    title: "Inbox",
    children: [
      { title: "Leads", href: "/admin/leads" },
      { title: "New", href: "/admin/leads?status=NEW", badge: "New" },
      { title: "Contacted", href: "/admin/leads?status=CONTACTED" },
      { title: "Scheduled", href: "/admin/leads?status=SCHEDULED" },
    ],
  },
  {
    title: "CRM",
    children: [
      { title: "Clients", href: "/admin/clients" },
      { title: "Companies", href: "/admin/companies" },
      { title: "Contacts", href: "/admin/contacts" },
    ],
  },
  {
    title: "Work",
    children: [
      { title: "Projects", href: "/admin/projects" },
      { title: "Jobs / Work Orders", href: "/admin/jobs" },
      { title: "Calendar", href: "/admin/calendar" },
    ],
  },
  {
    title: "Insights",
    children: [
      { title: "Pipeline", href: "/admin/pipeline" },
      { title: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    title: "Admin",
    children: [
      { title: "Settings", href: "/admin/settings" },
      { title: "Team", href: "/admin/team" },
    ],
  },
];
