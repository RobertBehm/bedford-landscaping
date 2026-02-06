import { prisma } from "@/lib/db";
import { daysPastDue } from "@/lib/invoice-aging";
import { subDays } from "@/lib/dates";

export type InvoiceAlert = {
  invoiceId: string;
  jobId: string;
  invoiceNumber: number;
  clientName: string;
  jobTitle: string;

  dueAtIso: string;
  daysOverdue: number;

  totalCents: number;
  amountPaidCents: number;

  lastReminderAtIso: string | null;

  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  badge: string; // e.g. "31+ overdue" / "No reminder 7d"
};

function severityFromDays(days: number): InvoiceAlert["severity"] {
  if (days >= 31) return "CRITICAL";
  if (days >= 15) return "HIGH";
  if (days >= 8) return "MEDIUM";
  return "LOW";
}

function bucketBadge(days: number) {
  if (days >= 31) return "31+ overdue";
  if (days >= 15) return "15–30 overdue";
  if (days >= 8) return "8–14 overdue";
  return "0–7 overdue";
}

/**
 * Fetch overdue invoice alerts.
 *
 * Rules:
 * - Invoice must be unpaid (paidAt = null)
 * - dueAt must exist and be < now
 * - We compute "days overdue" and severity
 * - We also fetch last reminder note date (InvoiceNote)
 *
 * TODO: Add cron-based scheduled reminders + auto-logged notes later.
 * TODO: Add "promise-to-pay" dates and follow-ups later.
 */
export async function getInvoiceAlerts(opts?: { now?: Date; limit?: number }) {
  const now = opts?.now ?? new Date();
  const limit = opts?.limit ?? 50;

  const overdue = await prisma.invoice.findMany({
    where: {
      paidAt: null,
      dueAt: { lt: now },
    },
    orderBy: [{ dueAt: "asc" }, { issuedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      number: true,
      totalCents: true,
      amountPaidCents: true,
      dueAt: true,
      job: {
        select: {
          id: true,
          title: true,
          client: { select: { name: true } },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const alerts: InvoiceAlert[] = overdue
    .map((inv) => {
      const dpd = daysPastDue(inv.dueAt, now);
      if (!inv.dueAt || dpd == null || dpd <= 0) return null;

      const lastReminderAt = inv.notes[0]?.createdAt ?? null;

      const lastReminderAtIso = lastReminderAt ? lastReminderAt.toISOString() : null;

      const base: InvoiceAlert = {
        invoiceId: inv.id,
        jobId: inv.job.id,
        invoiceNumber: inv.number,
        clientName: inv.job.client?.name ?? "—",
        jobTitle: inv.job.title,
        dueAtIso: inv.dueAt.toISOString(),
        daysOverdue: dpd,
        totalCents: inv.totalCents,
        amountPaidCents: inv.amountPaidCents,
        lastReminderAtIso,
        severity: severityFromDays(dpd),
        badge: bucketBadge(dpd),
      };

      return base;
    })
    .filter(Boolean) as InvoiceAlert[];

  // Add "No reminder in last 7 days" badge — these should bubble up
  const sevenDaysAgo = subDays(now, 7);

  const enhanced = alerts.map((a) => {
    const last = a.lastReminderAtIso ? new Date(a.lastReminderAtIso) : null;

    const overdueAndNoRecentReminder =
      a.daysOverdue >= 8 && (!last || last < sevenDaysAgo);

    if (!overdueAndNoRecentReminder) return a;

    const upgraded: InvoiceAlert = {
      ...a,
      severity: a.severity === "LOW" ? "MEDIUM" : a.severity, // bump minimum
      badge: `${a.badge} • No reminder 7d`,
    };

    return upgraded;
  });

  // Sort: highest severity first, then most overdue
  const severityRank: Record<InvoiceAlert["severity"], number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  enhanced.sort((a, b) => {
    const sr = severityRank[b.severity] - severityRank[a.severity];
    if (sr !== 0) return sr;
    return b.daysOverdue - a.daysOverdue;
  });

  return enhanced;
}
