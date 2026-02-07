import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AGING_BUCKETS,
  agingWhere,
  normalizeBucket,
  daysPastDue,
  type AgingBucket,
} from "@/lib/invoice-aging";

import ChargeInvoiceButton from "@/components/admin/ChargeInvoiceButton";

function money(cents: number | null | undefined) {
  const v = cents ?? 0;
  return `$${(v / 100).toFixed(2)}`;
}

type SearchParams = {
  q?: string;
  status?: string; // "OPEN" | "PAID" | ""
  bucket?: string; // AgingBucket
};

// Small helper so clicking the charge button doesn't activate the Link
function StopLinkNav({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // also stop on mousedown so it doesn't focus/trigger Link
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgAdmin();

  const sp = await searchParams;

  const now = new Date();

  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim(); // OPEN | PAID | ""
  const bucket: AgingBucket = normalizeBucket(sp.bucket);

  const statusFilter =
    status === "PAID"
      ? { paidAt: { not: null as any } }
      : status === "OPEN"
        ? { paidAt: null }
        : undefined;

  const bucketFilter = bucket ? agingWhere(bucket, now) : undefined;

  const qFilter = q
    ? {
        OR: [
          { job: { title: { contains: q, mode: "insensitive" } } },
          { job: { client: { name: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : undefined;

  const filters = [statusFilter, bucketFilter, qFilter].filter(Boolean);

  const where = filters.length ? ({ AND: filters } as any) : undefined;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: [{ paidAt: "asc" }, { dueAt: "asc" }, { issuedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      number: true,
      issuedAt: true,
      dueAt: true,
      paidAt: true,
      totalCents: true,
      amountPaidCents: true,
      job: {
        select: {
          id: true,
          title: true,
          status: true,
          client: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Invoices</h2>
          <p className="text-sm text-muted-foreground">Track invoiced work and collections.</p>
        </div>

        <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search job or client..."
            className="w-full sm:w-[280px]"
          />

          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="OPEN">Open (unpaid)</option>
            <option value="PAID">Paid</option>
          </select>

          <select
            name="bucket"
            defaultValue={bucket}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            title="Aging bucket"
          >
            {AGING_BUCKETS.map((b) => (
              <option key={b.value || "all"} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>

          <Button type="submit" variant="secondary">
            Apply
          </Button>

          {(q || status || bucket) && (
            <Button asChild variant="ghost">
              <Link href="/admin/invoices">Clear</Link>
            </Button>
          )}
        </form>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Latest</CardTitle>
          <div className="text-xs text-muted-foreground">{invoices.length} shown (max 200)</div>
        </CardHeader>

        <CardContent className="space-y-3">
          {invoices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No invoices found.</div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const dpd = daysPastDue(inv.dueAt, now);
                const unpaid = !inv.paidAt;

                const rightLabel =
                  unpaid && inv.dueAt
                    ? dpd === 0
                      ? "Due today"
                      : dpd && dpd > 0
                        ? `${dpd}d overdue`
                        : "Not due"
                    : inv.paidAt
                      ? "Paid"
                      : "—";

                return (
                  <Link
                    key={inv.id}
                    href={`/admin/jobs/${inv.job.id}`}
                    className="block rounded-lg border p-4 hover:bg-muted/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">
                          Invoice #{inv.number} • {inv.job.client?.name ?? "—"}
                        </div>
                        <div className="text-sm text-muted-foreground">{inv.job.title}</div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          Issued {inv.issuedAt.toISOString().slice(0, 10)}
                          {inv.dueAt ? ` • Due ${inv.dueAt.toISOString().slice(0, 10)}` : " • No due date"}
                          {inv.paidAt ? ` • Paid ${inv.paidAt.toISOString().slice(0, 10)}` : " • Unpaid"}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {unpaid ? (
                            <StopLinkNav>
                              <ChargeInvoiceButton invoiceId={inv.id} compact />
                            </StopLinkNav>
                          ) : null}

                          <div className="text-xs text-muted-foreground">
                            TODO: Add “Send reminder” + reminder history.
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold">{money(inv.totalCents)}</div>
                        <div className="text-xs text-muted-foreground">
                          Paid: {money(inv.amountPaidCents)}
                        </div>
                        <div className="mt-1 text-xs">
                          <span
                            className={
                              unpaid && dpd && dpd > 14 ? "text-destructive" : "text-muted-foreground"
                            }
                          >
                            {rightLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        TODO: Add aging summary cards (counts + $ totals per bucket) and plug into Alerts.
      </div>
    </div>
  );
}