// app/(admin)/admin/leads/page.tsx
import type { Prisma, LeadStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import UpdateLeadStatusForm from "@/components/leads/UpdateLeadStatusForm";
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

export default async function AdminLeadsPage({
  searchParams,
}: {
  // Next 15+ can pass this as a Promise in Server Components
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgAdmin();

  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const status = normalizeStatus(sp.status);

  // Build Prisma-safe filters with no `undefined` in arrays
  const filters: Prisma.LeadWhereInput[] = [];

  if (status) {
    filters.push({ status });
  }

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

  const where: Prisma.LeadWhereInput | undefined = filters.length ? { AND: filters } : undefined;

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground">Search, filter, and update lead statuses.</p>
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
          <div className="text-xs text-muted-foreground">{leads.length} shown (max 200)</div>
        </CardHeader>

        <CardContent className="space-y-4">
          {leads.length === 0 ? (
            <div className="text-sm text-muted-foreground">No leads found.</div>
          ) : (
            <div className="space-y-3">
              {leads.map((l) => (
                <div
                  key={l.id}
                  className="rounded-lg border p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-1 text-sm text-muted-foreground">
                      {l.phone}
                      {l.email ? ` • ${l.email}` : ""}
                      {l.city ? ` • ${l.city}` : ""}
                      {l.state ? `, ${l.state}` : ""}
                    </div>

                    <div className="mt-2 text-sm">
                      <span className="font-medium">Service:</span> {l.service || "—"}
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {l.message}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <UpdateLeadStatusForm leadId={l.id} status={l.status} />
                    {l.sourceUrl ? (
                      <a
                        href={l.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-muted-foreground"
                      >
                        Source
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
