import { subDays } from "@/lib/dates";

export type AgingBucket = "" | "current" | "0_7" | "8_14" | "15_30" | "31_plus";

export const AGING_BUCKETS: { value: AgingBucket; label: string }[] = [
  { value: "", label: "All" },
  { value: "current", label: "Current" },
  { value: "0_7", label: "0–7 overdue" },
  { value: "8_14", label: "8–14 overdue" },
  { value: "15_30", label: "15–30 overdue" },
  { value: "31_plus", label: "31+ overdue" },
];

export function daysPastDue(dueAt: Date | null | undefined, now: Date) {
  if (!dueAt) return null;
  const ms = now.getTime() - dueAt.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Build Prisma where fragment for open invoices based on aging bucket.
 *
 * NOTES:
 * - Uses dueAt only. If dueAt is null, invoice is treated as "current".
 * - Bucket filters only really apply meaningfully when filtering OPEN (unpaid).
 *
 * TODO: Later we can define "past due" based on issuedAt + defaultTermsDays when dueAt is missing.
 */
export function agingWhere(bucket: AgingBucket, now: Date) {
  switch (bucket) {
    case "current":
      // not past due OR no due date
      return {
        OR: [{ dueAt: null }, { dueAt: { gte: now } }],
      };

    case "0_7":
      return {
        dueAt: { lt: now, gte: subDays(now, 7) },
      };

    case "8_14":
      return {
        dueAt: { lt: subDays(now, 7), gte: subDays(now, 14) },
      };

    case "15_30":
      return {
        dueAt: { lt: subDays(now, 14), gte: subDays(now, 30) },
      };

    case "31_plus":
      return {
        dueAt: { lt: subDays(now, 30) },
      };

    default:
      return undefined;
  }
}

export function normalizeBucket(raw?: string): AgingBucket {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const allowed: AgingBucket[] = ["current", "0_7", "8_14", "15_30", "31_plus"];
  return (allowed as string[]).includes(s) ? (s as AgingBucket) : "";
}
