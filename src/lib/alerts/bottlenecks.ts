import { prisma } from "@/lib/db";
import { subDays } from "@/lib/dates";
import { getInvoiceAlerts } from "@/lib/alerts/invoice-alerts";

export type BottleneckSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BottleneckItem = {
  type: "DONE_NOT_INVOICED" | "OVERDUE_INVOICE_NO_REMINDER" | "OVERDUE_TASK";
  severity: BottleneckSeverity;
  title: string;
  subtitle: string;
  href: string;
  createdAtIso: string;
  badge: string;
};

function rankSeverity(sev: BottleneckSeverity) {
  switch (sev) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    default:
      return 1;
  }
}

/**
 * Bottlenecks = business gets stuck here.
 *
 * TODO: Add more bottlenecks later:
 * - Leads not contacted in 24h
 * - Jobs scheduled but not completed
 * - Jobs DONE but not PAID after X days
 * - Service plans with no generated jobs in X days (cron later)
 * - Crew capacity overload by day/week
 */
export async function getBottlenecks(opts?: { now?: Date; limit?: number }) {
  const now = opts?.now ?? new Date();
  const limit = opts?.limit ?? 12;

  // 1) DONE but not invoiced after 48h
  const doneThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const doneNotInvoiced = await prisma.job.findMany({
    where: {
      status: "DONE",
      invoice: null,
      updatedAt: { lt: doneThreshold },
    },
    orderBy: { updatedAt: "asc" },
    take: 20,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      client: { select: { name: true } },
    },
  });

  const b1: BottleneckItem[] = doneNotInvoiced.map((j) => ({
    type: "DONE_NOT_INVOICED",
    severity: "HIGH",
    title: "Job done, not invoiced",
    subtitle: `${j.client?.name ?? "—"} • ${j.title}`,
    href: `/admin/jobs/${j.id}`,
    createdAtIso: j.updatedAt.toISOString(),
    badge: "Invoice it",
  }));

  // 2) Overdue invoices with no reminder in last 7 days
  const invoiceAlerts = await getInvoiceAlerts({ now, limit: 50 });
  const sevenDaysAgo = subDays(now, 7);

  const b2: BottleneckItem[] = invoiceAlerts
    .filter((a) => {
      const last = a.lastReminderAtIso ? new Date(a.lastReminderAtIso) : null;
      return a.daysOverdue >= 8 && (!last || last < sevenDaysAgo);
    })
    .slice(0, 20)
    .map((a) => ({
      type: "OVERDUE_INVOICE_NO_REMINDER",
      severity: a.severity,
      title: "Overdue invoice — no recent reminder",
      subtitle: `#${a.invoiceNumber} • ${a.clientName} • ${a.daysOverdue}d overdue`,
      href: `/admin/jobs/${a.jobId}`,
      createdAtIso: a.dueAtIso,
      badge: "Log reminder",
    }));

  // 3) Overdue tasks (not completed)
  const overdueTasks = await prisma.task.findMany({
    where: {
      completedAt: null,
      dueAt: { lt: now },
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
    take: 20,
    select: {
      id: true,
      title: true,
      dueAt: true,
      priority: true,
    },
  });

  const b3: BottleneckItem[] = overdueTasks.map((t) => {
    const sev: BottleneckSeverity =
      t.priority === "HIGH" ? "HIGH" : t.priority === "MEDIUM" ? "MEDIUM" : "LOW";

    return {
      type: "OVERDUE_TASK",
      severity: sev,
      title: "Overdue task",
      subtitle: `${t.title} • due ${t.dueAt.toISOString().slice(0, 10)}`,
      href: `/admin/tasks`,
      createdAtIso: t.dueAt.toISOString(),
      badge: t.priority,
    };
  });

  const combined = [...b1, ...b2, ...b3];

  combined.sort((a, b) => {
    const sr = rankSeverity(b.severity) - rankSeverity(a.severity);
    if (sr !== 0) return sr;
    // older first (so the oldest stuck items rise)
    return a.createdAtIso < b.createdAtIso ? -1 : 1;
  });

  return combined.slice(0, limit);
}
