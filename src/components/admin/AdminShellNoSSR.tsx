"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const AdminShell = dynamic(() => import("@/components/admin/AdminShell"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-background text-foreground" />,
});

export default function AdminShellNoSSR({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
