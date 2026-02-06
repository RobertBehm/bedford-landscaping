import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminShellNoSSR from "@/components/admin/AdminShellNoSSR";
import { requireOrgAdmin } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
   await requireOrgAdmin();
  return <AdminShellNoSSR>{children}</AdminShellNoSSR>;
}
