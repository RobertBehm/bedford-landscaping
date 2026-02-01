"use client";

import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function AdminTopbar() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/leads" className="font-semibold tracking-tight">
            Admin
          </Link>
          <div className="hidden md:block text-sm text-muted-foreground">
            Manchester Lawncare & Landscaping
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OrganizationSwitcher
            appearance={{
              elements: { rootBox: "hidden sm:block" },
            }}
          />
          <Button asChild variant="secondary" className="hidden sm:inline-flex">
            <Link href="/">View Site</Link>
          </Button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
