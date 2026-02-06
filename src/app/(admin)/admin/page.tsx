import type { LeadStatus } from "@prisma/client";

import Link from "next/link";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";

import BottlenecksCard from "@/components/admin/BottlenecksCard";
import InvoiceAlertsCard from "@/components/admin/InvoiceAlertsCard";
import LeadsListClient from "@/components/admin/LeadsListClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SearchParams = {
  q?: string;
  status?: string;
};

const VALID_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "SCHEDULED", "COMPLETED", "ARCHIVED"];

function normalizeStatus(raw?: string): LeadStatus | null {
  const s = (raw ?? "").toUpperCase().trim();
  return (VALID_STATUSES as string[]).includes(s) ? (s as LeadStatus) : null;
}

// Keep this UTC-safe to avoid hydration warnings
function utcDisplayFromDate(d: Date) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

/**
 * Admin dashboard
 *
 * TODO: Add KPI cards (MRR, AR aging totals, lead->job conversion, close rate).
 * TODO: Add today's jobs + upcoming week workload.
 * TODO: Add "bottleneck" signals (overdue tasks, overdue invoices w/o reminders).
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgAdmin();

  const sp = await searchParams;

  // Optional filters (in case you later want dashboard search)
  const q = (sp.q ?? "").trim();
  const status = normalizeStatus(sp.status);

  const filters: any[] = [];
  if (status) filters.push({ status });

  if (q) {
    filters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { service: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where = filters.length ? { AND: filters } : undefined;

  const [leads, leadCounts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 20, // dashboard preview
    }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts = {
    NEW: 0,
    CONTACTED: 0,
    SCHEDULED: 0,
    COMPLETED: 0,
    ARCHIVED: 0,
  } satisfies Record<LeadStatus, number>;

  for (const row of leadCounts) {
    counts[row.status] = row._count._all;
  }

  const serialized = leads.map((l) => ({
    id: l.id,
    createdAtIso: l.createdAt.toISOString(),
    createdAtDisplay: utcDisplayFromDate(l.createdAt),

    name: l.name,
    email: l.email,
    phone: l.phone,
    city: l.city,
    state: l.state,
    service: l.service,
    message: l.message,
    status: l.status,
    sourceUrl: l.sourceUrl,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            High-signal overview: collections, bottlenecks, inbox, and what needs attention.
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/admin/leads">Open Leads</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/invoices">Open Invoices</Link>
          </Button>
        </div>
      </div>

      {/* Row 1: Money + Bottlenecks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InvoiceAlertsCard />
        <BottlenecksCard />
      </div>

      {/* Row 2: Lead summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lead Inbox</CardTitle>
          <Button asChild variant="ghost" className="h-8 px-2">
            <Link href="/admin/leads">View all</Link>
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">New</div>
              <div className="text-xl font-semibold">{counts.NEW}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Contacted</div>
              <div className="text-xl font-semibold">{counts.CONTACTED}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Scheduled</div>
              <div className="text-xl font-semibold">{counts.SCHEDULED}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="text-xl font-semibold">{counts.COMPLETED}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            TODO: Add lead→client conversion rate and “time to first contact”.
          </div>
        </CardContent>
      </Card>

      {/* Recent leads preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Leads</CardTitle>
          <div className="text-xs text-muted-foreground">{serialized.length} shown (max 20)</div>
        </CardHeader>

        <CardContent>
          <LeadsListClient leads={serialized} />
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        TODO: Add KPI cards: MRR, AR aging totals, close rate, lead response time, jobs completed per week.
      </div>
    </div>
  );
}
