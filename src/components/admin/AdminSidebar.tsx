"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminNav } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";

function isActiveRoute(currentPath: string, currentSearch: string, href: string) {
  // exact match including query if href contains '?'
  if (href.includes("?")) {
    return `${currentPath}${currentSearch}` === href;
  }
  // section match for nested routes
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const defaultOpen = useMemo(() => {
    // open the group that contains the active route
    const activeHref = `${pathname}${currentSearch}`;
    const open: Record<string, boolean> = {};
    for (const group of adminNav) {
      const hit = group.children?.some((c) => isActiveRoute(pathname, currentSearch, c.href)) ?? false;
      open[group.title] = hit;
    }
    return open;
  }, [pathname, currentSearch]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-3">
        <div className="text-xs font-medium text-muted-foreground">Navigation</div>
        <div className="text-sm font-semibold tracking-tight">CRM Admin</div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {adminNav.map((group) => (
            <Collapsible key={group.title} defaultOpen={defaultOpen[group.title]} className="mb-1">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-2 text-sm font-medium"
                >
                  <span>{group.title}</span>
                  <span className="text-muted-foreground">▾</span>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-1 space-y-1">
                {group.children?.map((item) => {
                  const active = isActiveRoute(pathname, currentSearch, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-md px-3 py-2 text-sm transition",
                        active
                          ? "bg-muted text-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <span className="truncate">{item.title}</span>
                      {item.badge ? (
                        <Badge variant="secondary" className="ml-2">
                          {item.badge}
                        </Badge>
                      ) : null}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-3 space-y-2">
        <Button asChild variant="secondary" className="w-full">
          <Link href="/admin/leads?status=NEW">View New Leads</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">View Website</Link>
        </Button>
      </div>
    </div>
  );
}
