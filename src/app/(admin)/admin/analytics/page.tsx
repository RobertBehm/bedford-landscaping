import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AlertsPanel from "@/components/admin/AlertsPanel";

function money(cents: number | null | undefined) {
  const v = cents ?? 0;
  return `$${(v / 100).toFixed(2)}`;
}

function ymd(d: Date) {
  // Stable SSR/client string (no locale mismatch)
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

function endOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
}

/**
 * MVP MRR approximation:
 * WEEKLY   ≈ 4.33 visits/month
 * BIWEEKLY ≈ 2.17 visits/month
 * MONTHLY  = 1 visit/month
 *
 * TODO: Replace with real recurrence expansion per plan (RRULE) and actual month lengths.
 */
function planToMRR(freq: "WEEKLY" | "BIWEEKLY" | "MONTHLY", pricePerVisitCents: number) {
  const multiplier = freq === "WEEKLY" ? 4.33 : freq === "BIWEEKLY" ? 2.17 : 1.0;
  return Math.round(pricePerVisitCents * multiplier);
}

export default async function AdminAnalyticsPage() {
  await requireOrgAdmin();

  const now = new Date();

  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 30);

  const next7 = daysFromNow(7);
  const next30 = daysFromNow(30);

  // --------- Leads funnel ----------
  const leadCounts = await prisma.lead.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const leadsLast30 = await prisma.lead.count({
    where: { createdAt: { gte: last30 } },
  });

  const leadCountMap = new Map<string, number>();
  for (const r of leadCounts) leadCountMap.set(String(r.status), r._count._all);

  const leadsNew = leadCountMap.get("NEW") ?? 0;
  const leadsContacted = leadCountMap.get("CONTACTED") ?? 0;
  const leadsScheduled = leadCountMap.get("SCHEDULED") ?? 0;
  const leadsCompleted = leadCountMap.get("COMPLETED") ?? 0;

  // --------- Jobs / Revenue ----------
  const jobCounts = await prisma.job.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const jobCountMap = new Map<string, number>();
  for (const r of jobCounts) jobCountMap.set(String(r.status), r._count._all);

  const jobsScheduled = jobCountMap.get("SCHEDULED") ?? 0;
  const jobsInProgress = jobCountMap.get("IN_PROGRESS") ?? 0;
  const jobsDone = jobCountMap.get("DONE") ?? 0;
  const jobsInvoiced = jobCountMap.get("INVOICED") ?? 0;
  const jobsPaid = jobCountMap.get("PAID") ?? 0;

  // Expected revenue is based on scheduledStart window + estimatedPriceCents (fallback to actualPriceCents if set)
  const jobsNext7 = await prisma.job.findMany({
    where: {
      scheduledStart: { gte: startOfDayUTC(now), lte: endOfDayUTC(next7) },
      status: { in: ["SCHEDULED", "IN_PROGRESS", "DONE", "INVOICED", "PAID"] },
    },
    select: { estimatedPriceCents: true, actualPriceCents: true, status: true },
  });

  const jobsNext30 = await prisma.job.findMany({
    where: {
      scheduledStart: { gte: startOfDayUTC(now), lte: endOfDayUTC(next30) },
      status: { in: ["SCHEDULED", "IN_PROGRESS", "DONE", "INVOICED", "PAID"] },
    },
    select: { estimatedPriceCents: true, actualPriceCents: true, status: true },
  });

  const expectedNext7 = jobsNext7.reduce((sum, j) => sum + (j.estimatedPriceCents ?? j.actualPriceCents ?? 0), 0);
  const expectedNext30 = jobsNext30.reduce((sum, j) => sum + (j.estimatedPriceCents ?? j.actualPriceCents ?? 0), 0);

  // Collected revenue = PAID jobs (actualPriceCents preferred, else estimated)
  const paidJobsLast30 = await prisma.job.findMany({
    where: {
      status: "PAID",
      updatedAt: { gte: last30 },
    },
    select: { actualPriceCents: true, estimatedPriceCents: true },
  });

  const collectedLast30 = paidJobsLast30.reduce(
    (sum, j) => sum + (j.actualPriceCents ?? j.estimatedPriceCents ?? 0),
    0
  );

  // Invoiced but unpaid = INVOICED status
  const invoicedOpen = await prisma.job.findMany({
    where: { status: "INVOICED" },
    select: { actualPriceCents: true, estimatedPriceCents: true },
  });

  const invoicedOutstanding = invoicedOpen.reduce(
    (sum, j) => sum + (j.actualPriceCents ?? j.estimatedPriceCents ?? 0),
    0
  );

  // --------- MRR from active Service Plans ----------
  const activePlans = await prisma.servicePlan.findMany({
    where: { status: "ACTIVE" },
    select: { frequency: true, pricePerVisitCents: true },
  });

  const projectedMRR = activePlans.reduce((sum, p) => {
    const price = p.pricePerVisitCents ?? 0;
    const freq = String(p.frequency) as "WEEKLY" | "BIWEEKLY" | "MONTHLY";
    return sum + planToMRR(freq, price);
  }, 0);

  // --------- Simple bottleneck scoring ----------
  // TODO: Replace with time-to-stage metrics and conversion rates per channel/source.
  const bottlenecks = [
    {
      label: "Leads still NEW",
      value: leadsNew,
      hint: "If this is high, follow-up speed is killing conversions.",
    },
    {
      label: "Jobs INVOICED (unpaid)",
      value: jobsInvoiced,
      hint: "High means cash collection is the bottleneck.",
    },
    {
      label: "Jobs DONE (not invoiced)",
      value: jobsDone,
      hint: "High means you’re not turning work into invoices fast enough.",
    },
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Revenue + operations overview. Today: {ymd(now)}.
          {" "}
          {/* TODO: Add date range picker (7d/30d/90d/custom) */}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Projected MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(projectedMRR)}</div>
            <div className="text-xs text-muted-foreground">
              Based on ACTIVE plans + frequency multipliers.
              {/* TODO: Replace with exact recurrence calendar math */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expected next 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(expectedNext7)}</div>
            <div className="text-xs text-muted-foreground">
              From scheduled jobs (estimated/actual).
              {/* TODO: Break down by route/crew */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expected next 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(expectedNext30)}</div>
            <div className="text-xs text-muted-foreground">
              From scheduled jobs (estimated/actual).
              {/* TODO: Include plan-based forecast even if jobs not generated yet */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Collected last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(collectedLast30)}</div>
            <div className="text-xs text-muted-foreground">
              PAID jobs updated in last 30 days.
              {/* TODO: Track actual paidAt timestamp when payments model exists */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Invoiced outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(invoicedOutstanding)}</div>
            <div className="text-xs text-muted-foreground">
              Jobs in INVOICED status (not yet PAID).
              {/* TODO: Add invoice due dates + aging buckets */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Leads created (last 30)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{leadsLast30}</div>
            <div className="text-xs text-muted-foreground">
              New lead volume for recent marketing.
              {/* TODO: Attribute by sourceUrl / UTM params / campaign */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Jobs scheduled / active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {jobsScheduled + jobsInProgress}
            </div>
            <div className="text-xs text-muted-foreground">
              Scheduled + In progress right now.
              {/* TODO: Add “overdue” logic */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <AlertsPanel />

      {/* Funnels */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="NEW" value={leadsNew} />
            <Row label="CONTACTED" value={leadsContacted} />
            <Row label="SCHEDULED" value={leadsScheduled} />
            <Row label="COMPLETED" value={leadsCompleted} />
            <div className="pt-2 text-xs text-muted-foreground">
              {/* TODO: Add conversion % and avg time between stages */}
              TODO: Add time-to-stage + conversion percentages per source/channel.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="SCHEDULED" value={jobsScheduled} />
            <Row label="IN_PROGRESS" value={jobsInProgress} />
            <Row label="DONE" value={jobsDone} />
            <Row label="INVOICED" value={jobsInvoiced} />
            <Row label="PAID" value={jobsPaid} />
            <div className="pt-2 text-xs text-muted-foreground">
              {/* TODO: Add job cycle time, invoice aging, and crew capacity */}
              TODO: Add job cycle time + invoice aging buckets + crew capacity.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottlenecks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Bottlenecks (quick read)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bottlenecks.map((b) => (
            <div key={b.label} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{b.label}</div>
                <div className="text-xl font-semibold">{b.value}</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{b.hint}</div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground">
            {/* TODO: These should be computed using business rules and targets */}
            TODO: Replace this with SLA-based alerts (follow-up within X hours, invoice within Y hours, etc.).
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next upgrades</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>TODO: Add Payments model (stripe/cash/check), paidAt, and deposit tracking.</li>
            <li>TODO: Add Invoice model + PDF + email sending + reminders.</li>
            <li>TODO: Add marketing attribution (UTM, sourceUrl parsing, campaigns).</li>
            <li>TODO: Add crew scheduling + route optimization.</li>
            <li>TODO: Add real MRR + churn + retention (per plan).</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
