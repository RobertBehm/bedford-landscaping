// app/(admin)/layout.tsx
import type { ReactNode } from "react";

export default function AdminGroupLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
