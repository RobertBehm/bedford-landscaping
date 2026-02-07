"use server";

import { prisma } from "@/lib/db";
import { requireClientUser } from "@/lib/client-auth";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };
export type ActionResult<T = unknown> = Ok<T> | Err;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Poll invoice status until paidAt is set (or amountPaidCents >= totalCents).
 * Used to avoid “refresh before webhook write” UX.
 *
 * TODO: Replace polling with realtime (SSE/WebSocket) later.
 */
export async function waitForInvoicePaidAction(
  invoiceId: string,
  opts?: { timeoutMs?: number; intervalMs?: number }
): Promise<ActionResult<{ paid: boolean }>> {
  const { clientId } = await requireClientUser();

  const timeoutMs = opts?.timeoutMs ?? 6500;
  const intervalMs = opts?.intervalMs ?? 350;

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, job: { clientId } },
      select: { paidAt: true, totalCents: true, amountPaidCents: true },
    });

    if (!inv) return { ok: false, error: "Invoice not found." };

    const paid = !!inv.paidAt || (inv.amountPaidCents ?? 0) >= inv.totalCents;
    if (paid) return { ok: true, data: { paid: true } };

    await sleep(intervalMs);
  }

  // Not fatal; caller can still refresh.
  return { ok: true, data: { paid: false } };
}

/**
 * Poll payment methods until a specific Stripe PM id appears.
 *
 * TODO: Replace polling with realtime later.
 */
export async function waitForPaymentMethodSavedAction(
  stripePaymentMethodId: string,
  opts?: { timeoutMs?: number; intervalMs?: number }
): Promise<ActionResult<{ found: boolean }>> {
  const { clientId } = await requireClientUser();

  const timeoutMs = opts?.timeoutMs ?? 6500;
  const intervalMs = opts?.intervalMs ?? 350;

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const found = await prisma.clientPaymentMethod.findFirst({
      where: { clientId, stripePaymentMethodId },
      select: { id: true },
    });

    if (found) return { ok: true, data: { found: true } };

    await sleep(intervalMs);
  }

  return { ok: true, data: { found: false } };
}