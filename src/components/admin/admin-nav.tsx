export type AdminNavItem = {
  title: string;
  children?: { title: string; href: string; badge?: string }[];
};

export const adminNav: AdminNavItem[] = [
  {
    title: "Overview",
    children: [
      { title: "Dashboard", href: "/admin" },
      { title: "Analytics", href: "/admin/analytics" },
      { title: "Tasks", href: "/admin/tasks" },
    ],
  },
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
      { title: "Jobs / Work Orders", href: "/admin/jobs" },
      { title: "Service Plans", href: "/admin/plans" }, // ✅ recurring revenue engine
      { title: "Invoices", href: "/admin/invoices" }, 
      { title: "Calendar", href: "/admin/calendar" },
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
