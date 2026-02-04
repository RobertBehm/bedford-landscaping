import type { LeadStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import LeadsListClient from "@/components/admin/LeadsListClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
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

function utcDisplayFromDate(d: Date) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgAdmin();

  const sp = await searchParams;

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

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground">Click a lead to view details, tasks, and notes.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form className="flex items-center gap-2">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search name, phone, email, service..."
              className="w-full sm:w-[320px]"
            />

            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {VALID_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>

          {(q || status) && (
            <Button asChild variant="ghost">
              <Link href="/admin/leads">Clear</Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Latest</CardTitle>
          <div className="text-xs text-muted-foreground">{serialized.length} shown (max 200)</div>
        </CardHeader>

        <CardContent className="space-y-4">
          {serialized.length === 0 ? (
            <div className="text-sm text-muted-foreground">No leads found.</div>
          ) : (
            <LeadsListClient leads={serialized as any} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
