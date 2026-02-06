"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; error: string };

function parseIntOrNull(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseMoneyToCents(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function parseDateOrNull(v: FormDataEntryValue | null): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createServicePlanAction(fd: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireOrgAdmin();

    const clientId = String(fd.get("clientId") ?? "").trim();
    if (!clientId) return { ok: false, error: "Missing clientId." };

    const title = String(fd.get("title") ?? "").trim();
    if (!title) return { ok: false, error: "Title is required." };

    const frequency = String(fd.get("frequency") ?? "").trim();
    if (!["WEEKLY", "BIWEEKLY", "MONTHLY"].includes(frequency)) {
      return { ok: false, error: "Invalid frequency." };
    }

    const status = String(fd.get("status") ?? "ACTIVE").trim();
    if (!["ACTIVE", "PAUSED", "CANCELED"].includes(status)) {
      return { ok: false, error: "Invalid status." };
    }

    const addressIdRaw = String(fd.get("addressId") ?? "").trim();
    const addressId = addressIdRaw || null;

    const notesRaw = String(fd.get("notes") ?? "").trim();
    const notes = notesRaw || null;

    const startDate = parseDateOrNull(fd.get("startDate"));
    if (!startDate) return { ok: false, error: "Start date is required." };

    const endDate = parseDateOrNull(fd.get("endDate"));

    const dayOfWeek = parseIntOrNull(fd.get("dayOfWeek"));
    const dayOfMonth = parseIntOrNull(fd.get("dayOfMonth"));

    const pricePerVisitCents = parseMoneyToCents(fd.get("pricePerVisit"));

    // TODO: Validate dayOfWeek/dayOfMonth based on frequency more strictly.
    // TODO: Add business timezone awareness for schedule anchoring.

    const plan = await prisma.servicePlan.create({
      data: {
        clientId,
        addressId,
        title,
        notes,
        frequency: frequency as any,
        status: status as any,
        startDate,
        endDate,
        dayOfWeek,
        dayOfMonth,
        pricePerVisitCents,
      },
      select: { id: true },
    });

    revalidatePath("/admin/plans");
    revalidatePath(`/admin/clients/${clientId}`);

    return { ok: true, message: "Service plan created.", data: { id: plan.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create plan." };
  }
}

export async function updateServicePlanAction(fd: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const id = String(fd.get("id") ?? "").trim();
    if (!id) return { ok: false, error: "Missing plan id." };

    const title = String(fd.get("title") ?? "").trim();
    if (!title) return { ok: false, error: "Title is required." };

    const frequency = String(fd.get("frequency") ?? "").trim();
    if (!["WEEKLY", "BIWEEKLY", "MONTHLY"].includes(frequency)) {
      return { ok: false, error: "Invalid frequency." };
    }

    const status = String(fd.get("status") ?? "ACTIVE").trim();
    if (!["ACTIVE", "PAUSED", "CANCELED"].includes(status)) {
      return { ok: false, error: "Invalid status." };
    }

    const addressIdRaw = String(fd.get("addressId") ?? "").trim();
    const addressId = addressIdRaw || null;

    const notesRaw = String(fd.get("notes") ?? "").trim();
    const notes = notesRaw || null;

    const startDate = parseDateOrNull(fd.get("startDate"));
    if (!startDate) return { ok: false, error: "Start date is required." };

    const endDate = parseDateOrNull(fd.get("endDate"));

    const dayOfWeek = parseIntOrNull(fd.get("dayOfWeek"));
    const dayOfMonth = parseIntOrNull(fd.get("dayOfMonth"));
    const pricePerVisitCents = parseMoneyToCents(fd.get("pricePerVisit"));

    const plan = await prisma.servicePlan.update({
      where: { id },
      data: {
        title,
        notes,
        frequency: frequency as any,
        status: status as any,
        addressId,
        startDate,
        endDate,
        dayOfWeek,
        dayOfMonth,
        pricePerVisitCents,
      },
      select: { clientId: true },
    });

    revalidatePath("/admin/plans");
    revalidatePath(`/admin/plans/${id}`);
    revalidatePath(`/admin/clients/${plan.clientId}`);

    return { ok: true, message: "Service plan saved." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save plan." };
  }
}

export async function setServicePlanStatusAction(fd: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const id = String(fd.get("id") ?? "").trim();
    const status = String(fd.get("status") ?? "").trim();
    if (!id) return { ok: false, error: "Missing plan id." };
    if (!["ACTIVE", "PAUSED", "CANCELED"].includes(status)) return { ok: false, error: "Invalid status." };

    const plan = await prisma.servicePlan.update({
      where: { id },
      data: { status: status as any },
      select: { clientId: true },
    });

    revalidatePath("/admin/plans");
    revalidatePath(`/admin/plans/${id}`);
    revalidatePath(`/admin/clients/${plan.clientId}`);

    return { ok: true, message: `Plan set to ${status}.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update status." };
  }
}

/**
 * Generate upcoming jobs for all ACTIVE plans (or a single plan).
 *
 * TODO: Move this to a scheduled cron (Vercel Cron / GitHub Action / worker) later.
 * TODO: Add business timezone and DST-correct scheduling.
 * TODO: Add “skip dates” (rain delays), holiday rules, and route optimization later.
 */
export async function generateUpcomingJobsAction(fd: FormData): Promise<ActionResult<{ created: number }>> {
  try {
    await requireOrgAdmin();

    const planIdRaw = String(fd.get("planId") ?? "").trim();
    const daysAheadRaw = String(fd.get("daysAhead") ?? "").trim();
    const daysAhead = daysAheadRaw ? Math.max(1, Math.min(60, Number(daysAheadRaw))) : 14;

    const plans = await prisma.servicePlan.findMany({
      where: {
        ...(planIdRaw ? { id: planIdRaw } : {}),
        status: "ACTIVE",
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    if (plans.length === 0) {
      return { ok: true, message: "No active plans to generate.", data: { created: 0 } };
    }

    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + daysAhead);

    let created = 0;

    for (const p of plans) {
      // Determine starting point for generation
      const anchor = p.lastGeneratedAt && p.lastGeneratedAt > p.startDate ? p.lastGeneratedAt : p.startDate;
      const start = anchor > now ? anchor : now;

      const occurrences = computeOccurrences({
        plan: p,
        start,
        end: windowEnd,
      });

      for (const occ of occurrences) {
        // Respect endDate if present
        if (p.endDate && occ > p.endDate) continue;

        // Create job at “9am local” MVP (approx).
        // TODO: Replace fixed offset with timezone-aware conversion.
        const scheduledStart = setLocalMorningApproxNY(occ, 9, 0);

        // If monthly and day doesn't exist (e.g., Feb 30), computeOccurrences skips it.
        try {
          await prisma.job.create({
            data: {
              clientId: p.clientId,
              addressId: p.addressId,
              title: p.title,
              notes: p.notes,
              status: "SCHEDULED",
              scheduledStart,
              estimatedPriceCents: p.pricePerVisitCents,
              servicePlanId: p.id,
            },
          });
          created++;
        } catch (e: any) {
          // Unique constraint dedupe: already exists
          // TODO: Track duplicates and surface counts.
          const msg = String(e?.message ?? "");
          if (msg.includes("Unique constraint failed")) {
            continue;
          }
          // Some other failure
          throw e;
        }
      }

      await prisma.servicePlan.update({
        where: { id: p.id },
        data: { lastGeneratedAt: windowEnd },
      });
    }

    revalidatePath("/admin/jobs");
    revalidatePath("/admin/plans");

    return { ok: true, message: `Generated jobs. Created ${created}.`, data: { created } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to generate jobs." };
  }
}

/** ------- helpers ------- */

function computeOccurrences({
  plan,
  start,
  end,
}: {
  plan: {
    frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
    startDate: Date;
    dayOfWeek: number | null;
    dayOfMonth: number | null;
  };
  start: Date;
  end: Date;
}) {
  const results: Date[] = [];

  const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0));
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 0, 0, 0));

  if (plan.frequency === "MONTHLY") {
    const dom = plan.dayOfMonth ?? plan.startDate.getUTCDate();
    // iterate months from startDay -> endDay
    let y = startDay.getUTCFullYear();
    let m = startDay.getUTCMonth();

    while (true) {
      const candidate = new Date(Date.UTC(y, m, dom, 0, 0, 0));
      // if dom overflowed (e.g. Feb 31), Date will roll to next month; detect by month mismatch
      if (candidate.getUTCMonth() === m) {
        if (candidate >= startDay && candidate <= endDay) results.push(candidate);
      }

      if (y > endDay.getUTCFullYear() || (y === endDay.getUTCFullYear() && m >= endDay.getUTCMonth())) break;

      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }

    return results;
  }

  // WEEKLY / BIWEEKLY
  const intervalDays = plan.frequency === "WEEKLY" ? 7 : 14;
  const targetDow = plan.dayOfWeek ?? plan.startDate.getUTCDay(); // 0..6

  // Find the first date >= startDay that matches day-of-week
  let cur = new Date(startDay);
  while (cur.getUTCDay() !== targetDow) cur.setUTCDate(cur.getUTCDate() + 1);

  // Step by interval
  while (cur <= endDay) {
    if (cur >= startDay) results.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + intervalDays);
  }

  return results;
}

/**
 * MVP “New York local morning” time.
 * We approximate EST offset (-5). DST will be wrong during summer.
 *
 * TODO: Replace this with timezone-aware conversion using business timezone.
 */
function setLocalMorningApproxNY(dateUTC0: Date, hourLocal: number, minuteLocal: number) {
  // If local is UTC-5, then local 9:00 = 14:00Z
  const assumedOffsetHours = 5;
  return new Date(Date.UTC(
    dateUTC0.getUTCFullYear(),
    dateUTC0.getUTCMonth(),
    dateUTC0.getUTCDate(),
    hourLocal + assumedOffsetHours,
    minuteLocal,
    0
  ));
}
