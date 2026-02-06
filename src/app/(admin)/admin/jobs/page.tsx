import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchParams = {
  q?: string;
  status?: string;
  range?: string; // "today" | "week" | "all"
};

const STATUSES = ["DRAFT", "SCHEDULED", "IN_PROGRESS", "DONE", "INVOICED", "PAID", "CANCELED"] as const;
type JobStatus = (typeof STATUSES)[number];

function normalizeStatus(raw?: string): JobStatus | null {
  const s = (raw ?? "").toUpperCase().trim();
  return (STATUSES as readonly string[]).includes(s) ? (s as JobStatus) : null;
}

function utcDisplayFromDate(d: Date) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
}

function addDaysUTC(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgAdmin();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = normalizeStatus(sp.status);
  const range = (sp.range ?? "week").toLowerCase();

  const filters: Prisma.JobWhereInput[] = [];

  if (status) filters.push({ status });

  if (q) {
    filters.push({
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { notes: { contains: q, mode: "insensitive" as const } },
        { client: { name: { contains: q, mode: "insensitive" as const } } },
        { client: { email: { contains: q, mode: "insensitive" as const } } },
        { client: { phone: { contains: q, mode: "insensitive" as const } } },
      ],
    });
  }

  if (range !== "all") {
    const start = startOfTodayUTC();
    const end = range === "today" ? addDaysUTC(start, 1) : addDaysUTC(start, 7);
    filters.push({
      scheduledStart: { gte: start, lt: end },
    });
  }

  const where: Prisma.JobWhereInput | undefined = filters.length ? { AND: filters } : undefined;

  const jobs = await prisma.job.findMany({
    where,
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      client: { select: { id: true, name: true } },
      address: { select: { id: true, address: true, city: true, state: true, zip: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Jobs</h2>
          <p className="text-sm text-muted-foreground">Your production schedule and work orders.</p>
        </div>

        <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search job, notes, client..."
            className="w-full sm:w-[280px]"
          />

          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            name="range"
            defaultValue={range}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Next 7 days</option>
            <option value="all">All</option>
          </select>

          <Button type="submit" variant="secondary">
            Apply
          </Button>

          {(q || status || range !== "week") && (
            <Button asChild variant="ghost">
              <Link href="/admin/jobs">Clear</Link>
            </Button>
          )}
        </form>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Upcoming</CardTitle>
          <div className="text-xs text-muted-foreground">{jobs.length} shown (max 200)</div>
        </CardHeader>

        <CardContent className="space-y-3">
          {jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No jobs found.</div>
          ) : (
            jobs.map((j) => {
              const addr = j.address
                ? [
                    j.address.address,
                    j.address.city,
                    j.address.state,
                    j.address.zip,
                  ].filter(Boolean).join(", ")
                : null;

              return (
                <Link
                  key={j.id}
                  href={`/admin/jobs/${j.id}`}
                  className="block rounded-lg border p-4 transition hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{j.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {j.scheduledStart ? utcDisplayFromDate(j.scheduledStart) : "Not scheduled"}
                        </div>
                      </div>

                      <div className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{j.client.name}</span>
                        {addr ? ` • ${addr}` : ""}
                      </div>

                      {j.estimatedPriceCents != null ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Est: ${(j.estimatedPriceCents / 100).toFixed(2)}
                          {j.actualPriceCents != null ? ` • Actual: $${(j.actualPriceCents / 100).toFixed(2)}` : ""}
                        </div>
                      ) : j.actualPriceCents != null ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Actual: ${(j.actualPriceCents / 100).toFixed(2)}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-xs rounded-md border px-2 py-1 inline-flex self-start">
                      {j.status}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
