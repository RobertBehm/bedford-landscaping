import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function usd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (cents ?? 0) / 100
  );
}

function startOfThisMonthUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

export default async function ProfitReportPage() {
  await requireOrgAdmin();

  const since = startOfThisMonthUtc();

  // Revenue = paid invoices this month (MVP)
  // TODO: handle partial payments properly (amountPaidCents) + payments ledger model later.
  const revenueAgg = await prisma.invoice.aggregate({
    _sum: { amountPaidCents: true },
    where: { paidAt: { not: null }, issuedAt: { gte: since } },
  });

  const expensesAgg = await prisma.expense.aggregate({
    _sum: { amountCents: true },
    where: { occurredAt: { gte: since } },
  });

  const revenue = revenueAgg._sum.amountPaidCents ?? 0;
  const expenses = expensesAgg._sum.amountCents ?? 0;
  const profit = revenue - expenses;

  // Top jobs by profit (paid - expenses) this month
  // TODO: include invoices issued earlier but paid this month, depending on accounting preference.
  const jobs = await prisma.job.findMany({
    where: {
      invoice: { paidAt: { not: null }, issuedAt: { gte: since } },
    },
    include: {
      invoice: { select: { amountPaidCents: true } },
      expenses: { select: { amountCents: true } },
      client: { select: { name: true } },
    },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  const jobRows = jobs
    .map((j) => {
      const paid = j.invoice?.amountPaidCents ?? 0;
      const cost = j.expenses.reduce((sum, e) => sum + e.amountCents, 0);
      return {
        id: j.id,
        title: j.title,
        client: j.client.name,
        paid,
        cost,
        profit: paid - cost,
      };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Profit</h2>
        <p className="text-sm text-muted-foreground">
          This month (UTC). TODO: add date range + cash/accrual toggle.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collected</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{usd(revenue)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{usd(expenses)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{usd(profit)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top jobs this month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No paid jobs found this month.</div>
          ) : (
            <div className="space-y-2">
              {jobRows.map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-sm text-muted-foreground">{r.client}</div>
                  <div className="mt-2 text-sm">
                    Paid: {usd(r.paid)} • Cost: {usd(r.cost)} •{" "}
                    <span className="font-medium">Profit: {usd(r.profit)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            TODO: Add “loss leaders”, profit by service type, and marketing spend allocation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}