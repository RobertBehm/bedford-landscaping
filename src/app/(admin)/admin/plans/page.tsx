import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GenerateJobsButtonClient from "@/components/admin/GenerateJobsButtonClient";

type SearchParams = {
  q?: string;
  status?: string;
  frequency?: string;
};

const STATUSES = ["ACTIVE", "PAUSED", "CANCELED"] as const;
const FREQUENCIES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;

function norm(v?: string) {
  return (v ?? "").trim();
}

export default async function AdminPlansPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireOrgAdmin();
  const sp = await searchParams;

  const q = norm(sp.q);
  const status = norm(sp.status).toUpperCase();
  const frequency = norm(sp.frequency).toUpperCase();

  const filters: Prisma.ServicePlanWhereInput[] = [];

  if (STATUSES.includes(status as any)) filters.push({ status: status as any });
  if (FREQUENCIES.includes(frequency as any)) filters.push({ frequency: frequency as any });

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

  const where: Prisma.ServicePlanWhereInput | undefined = filters.length ? { AND: filters } : undefined;

  const plans = await prisma.servicePlan.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      client: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Service Plans</h2>
          <p className="text-sm text-muted-foreground">
            Recurring work that generates Jobs automatically.
            {" "}
            <span className="text-xs">
              {/* TODO: Add cron to auto-run generation daily */}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <GenerateJobsButtonClient />

          <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input name="q" defaultValue={q} placeholder="Search plan or client..." className="w-full sm:w-[260px]" />

            <select
              name="status"
              defaultValue={STATUSES.includes(status as any) ? status : ""}
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
              name="frequency"
              defaultValue={FREQUENCIES.includes(frequency as any) ? frequency : ""}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All frequencies</option>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <Button type="submit" variant="secondary">
              Apply
            </Button>

            {(q || status || frequency) && (
              <Button asChild variant="ghost">
                <Link href="/admin/plans">Clear</Link>
              </Button>
            )}
          </form>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Plans</CardTitle>
          <div className="text-xs text-muted-foreground">{plans.length} shown (max 200)</div>
        </CardHeader>

        <CardContent className="space-y-3">
          {plans.length === 0 ? (
            <div className="text-sm text-muted-foreground">No plans found.</div>
          ) : (
            plans.map((p) => (
              <Link
                key={p.id}
                href={`/admin/plans/${p.id}`}
                className="block rounded-lg border p-4 transition hover:bg-muted/40"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs rounded-md border px-2 py-0.5 inline-flex">{p.frequency}</div>
                      <div className="text-xs rounded-md border px-2 py-0.5 inline-flex">{p.status}</div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Client: <span className="font-medium text-foreground">{p.client.name}</span>
                      {p.pricePerVisitCents != null ? ` • $${(p.pricePerVisitCents / 100).toFixed(2)}/visit` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(p.updatedAt).toISOString().slice(0, 10)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
