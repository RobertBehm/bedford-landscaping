import type { ReactNode } from "react";
import AdminTopbar from "@/components/admin/AdminTopbar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminTopbar />

      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
          {/* Mobile sidebar button */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary" className="w-full">
                  Open Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[320px]">
                <AdminSidebar />
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden md:block md:sticky md:top-[72px] md:h-[calc(100vh-72px)] rounded-xl border bg-card overflow-hidden">
            <AdminSidebar />
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
