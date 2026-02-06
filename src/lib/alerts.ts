import { prisma } from "@/lib/db";
import { daysBetween, subDays } from "@/lib/dates";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  href: string;
  createdAtIso: string;
  ageDays: number;
};

function sev(n: number, warningAt: number, criticalAt: number): AlertSeverity {
  if (n >= criticalAt) return "critical";
  if (n >= warningAt) return "warning";
  return "info";
}

export async function getAlerts(now = new Date()): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];

  // ---------------------------
  // Leads: NEW > 1 day
  // ---------------------------
  const leadsNew = await prisma.lead.findMany({
    where: { status: "NEW", createdAt: { lte: subDays(now, 1) } },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 25,
  });

  for (const l of leadsNew) {
    const ageDays = daysBetween(l.createdAt, now);
    alerts.push({
      id: `lead-new-${l.id}`,
      severity: sev(ageDays, 1, 3),
      title: "Lead not contacted",
      detail: `${l.name} has been NEW for ${ageDays} day(s).`,
      href: `/admin/leads?status=NEW`,
      createdAtIso: l.createdAt.toISOString(),
      ageDays,
    });
  }

  // ---------------------------
  // Leads: CONTACTED > 7 days (not scheduled)
  // ---------------------------
  const leadsContacted = await prisma.lead.findMany({
    where: { status: "CONTACTED", updatedAt: { lte: subDays(now, 7) } },
    select: { id: true, name: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
    take: 25,
  });

  for (const l of leadsContacted) {
    const ageDays = daysBetween(l.updatedAt, now);
    alerts.push({
      id: `lead-contacted-${l.id}`,
      severity: sev(ageDays, 7, 14),
      title: "Lead stalled after contact",
      detail: `${l.name} has been CONTACTED but unchanged for ${ageDays} day(s).`,
      href: `/admin/leads?status=CONTACTED`,
      createdAtIso: l.updatedAt.toISOString(),
      ageDays,
    });
  }

  // ---------------------------
  // Jobs: DONE > 2 days (not invoiced/paid)
  // ---------------------------
  const jobsDone = await prisma.job.findMany({
    where: {
      status: "DONE",
      updatedAt: { lte: subDays(now, 2) },
    },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
    take: 25,
  });

  for (const j of jobsDone) {
    const ageDays = daysBetween(j.updatedAt, now);
    alerts.push({
      id: `job-done-${j.id}`,
      severity: sev(ageDays, 2, 5),
      title: "Job completed but not invoiced",
      detail: `"${j.title}" is DONE and has not been invoiced for ${ageDays} day(s).`,
      href: `/admin/jobs/${j.id}`,
      createdAtIso: j.updatedAt.toISOString(),
      ageDays,
    });
  }

  // ---------------------------
  // Jobs: INVOICED > 14 days (not paid)
  // ---------------------------
  const jobsInvoiced = await prisma.job.findMany({
    where: {
      status: "INVOICED",
      updatedAt: { lte: subDays(now, 14) },
    },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
    take: 25,
  });

  for (const j of jobsInvoiced) {
    const ageDays = daysBetween(j.updatedAt, now);
    alerts.push({
      id: `job-invoiced-${j.id}`,
      severity: sev(ageDays, 14, 30),
      title: "Invoice overdue",
      detail: `"${j.title}" has been INVOICED for ${ageDays} day(s) and not marked PAID.`,
      href: `/admin/jobs/${j.id}`,
      createdAtIso: j.updatedAt.toISOString(),
      ageDays,
    });
  }

  // ---------------------------
  // Jobs: Overdue scheduledStart
  // ---------------------------
  const overdue = await prisma.job.findMany({
    where: {
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      scheduledStart: { not: null, lt: now },
    },
    select: { id: true, title: true, scheduledStart: true },
    orderBy: { scheduledStart: "asc" },
    take: 25,
  });

  for (const j of overdue) {
    const start = j.scheduledStart!;
    const ageDays = daysBetween(start, now);
    alerts.push({
      id: `job-overdue-${j.id}`,
      severity: sev(ageDays, 0, 1),
      title: "Overdue job",
      detail: `"${j.title}" was scheduled for ${start.toISOString().slice(0, 10)}.`,
      href: `/admin/jobs/${j.id}`,
      createdAtIso: start.toISOString(),
      ageDays,
    });
  }

  // Sort: most severe then oldest
  const rank: Record<AlertSeverity, number> = { critical: 3, warning: 2, info: 1 };

  alerts.sort((a, b) => {
    const rs = rank[b.severity] - rank[a.severity];
    if (rs !== 0) return rs;
    return b.ageDays - a.ageDays;
  });

  return alerts.slice(0, 50);
}

/**
 * TODO: Later we will:
 * - add cron to compute/store alerts daily
 * - add notifications (email/SMS/push) based on severity thresholds
 * - add per-user settings (SLA thresholds)
 */
