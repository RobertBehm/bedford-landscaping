"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; error: string };

function toCents(input: string | null) {
  const s = (input ?? "").trim();
  if (!s) return null;

  const num = Number(s);
  if (!Number.isFinite(num)) return null;

  // allow "65" or "65.50"
  return Math.round(num * 100);
}

function parseDateTimeLocal(input: string | null) {
  const s = (input ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function createExpenseAction(fd: FormData): Promise<ActionResult<{ expenseId: string }>> {
  await requireOrgAdmin();
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized." };

  const amountCents = toCents(fd.get("amount") as string | null);
  if (amountCents == null || amountCents <= 0) {
    return { ok: false, error: "Amount is required and must be > 0." };
  }

  const occurredAt = parseDateTimeLocal(fd.get("occurredAt") as string | null) ?? new Date();
  const category = String(fd.get("category") ?? "OTHER");
  const vendor = (fd.get("vendor") as string | null)?.trim() || null;
  const memo = (fd.get("memo") as string | null)?.trim() || null;

  const jobId = (fd.get("jobId") as string | null)?.trim() || null;
  const clientId = (fd.get("clientId") as string | null)?.trim() || null;

  try {
    const created = await prisma.expense.create({
      data: {
        occurredAt,
        category: category as any,
        vendor,
        memo,
        amountCents,
        jobId,
        clientId,
        createdByUserId: userId,
      },
      select: { id: true },
    });

    return { ok: true, message: "Expense added.", data: { expenseId: created.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to create expense." };
  }
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionResult> {
  await requireOrgAdmin();

  try {
    await prisma.expense.delete({ where: { id: expenseId } });
    return { ok: true, message: "Expense deleted." };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to delete expense." };
  }
}