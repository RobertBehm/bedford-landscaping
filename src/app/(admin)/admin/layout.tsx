import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { requireOrgAdmin } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireOrgAdmin();
  return <AdminShell>{children}</AdminShell>;
}
