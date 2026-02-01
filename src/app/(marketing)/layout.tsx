// app/(marketing)/layout.tsx
import type { ReactNode } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
    </div>
  );
}
