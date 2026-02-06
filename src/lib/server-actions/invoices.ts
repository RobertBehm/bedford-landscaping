"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; error: string };

function parseMoneyToCents(raw: string | null): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function parseOptionalDate(raw: string | null): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Create invoice for a job.
 * - invoice.totalCents defaults to job.actualPriceCents ?? job.estimatedPriceCents ?? 0
 * - sets job.status = INVOICED
 *
 * TODO: Replace number allocation with a dedicated counter table for concurrency safety.
 */
export async function createInvoiceAction(fd: FormData): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    await requireOrgAdmin();

    const jobId = String(fd.get("jobId") ?? "").trim();
    if (!jobId) return { ok: false, error: "Missing jobId." };

    const dueAt = parseOptionalDate(fd.get("dueAt") as string | null);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        estimatedPriceCents: true,
        actualPriceCents: true,
        invoice: { select: { id: true } },
      },
    });

    if (!job) return { ok: false, error: "Job not found." };
    if (job.invoice) return { ok: false, error: "Invoice already exists for this job." };

    const totalCents = job.actualPriceCents ?? job.estimatedPriceCents ?? 0;

    // naive next invoice number
    const last = await prisma.invoice.findFirst({
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const nextNumber = (last?.number ?? 1000) + 1;

    const invoice = await prisma.invoice.create({
      data: {
        number: nextNumber,
        jobId: job.id,
        dueAt: dueAt ?? undefined,
        totalCents,
        // issuedAt defaults to now
      },
      select: { id: true },
    });

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "INVOICED" },
    });

    return { ok: true, message: "Invoice created.", data: { invoiceId: invoice.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to create invoice." };
  }
}

/**
 * Mark invoice paid.
 * - sets invoice paidAt/paymentMethod/amountPaidCents
 * - sets job.status = PAID
 *
 * TODO: Add partial payments + multiple payment records.
 * TODO: Add Stripe integration later.
 */
export async function markInvoicePaidAction(fd: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const invoiceId = String(fd.get("invoiceId") ?? "").trim();
    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };

    const paymentMethod = String(fd.get("paymentMethod") ?? "").trim();
    const amountPaidCents = parseMoneyToCents(fd.get("amountPaid") as string | null);

    if (!paymentMethod) return { ok: false, error: "Payment method is required." };
    if (amountPaidCents == null) return { ok: false, error: "Valid amount paid is required." };

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, totalCents: true, jobId: true, paidAt: true },
    });

    if (!invoice) return { ok: false, error: "Invoice not found." };
    if (invoice.paidAt) return { ok: false, error: "Invoice is already marked paid." };

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAt: new Date(),
        paymentMethod: paymentMethod as any,
        amountPaidCents,
      },
    });

    await prisma.job.update({
      where: { id: invoice.jobId },
      data: { status: "PAID", actualPriceCents: amountPaidCents },
    });

    return { ok: true, message: "Invoice marked paid." };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to mark paid." };
  }
}

/**
 * Optional: mark invoice unpaid (re-open)
 *
 * TODO: Add permission checks by org/team roles.
 */
export async function reopenInvoiceAction(fd: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const invoiceId = String(fd.get("invoiceId") ?? "").trim();
    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, jobId: true },
    });
    if (!invoice) return { ok: false, error: "Invoice not found." };

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { paidAt: null, paymentMethod: null, amountPaidCents: 0 },
    });

    await prisma.job.update({
      where: { id: invoice.jobId },
      data: { status: "INVOICED" },
    });

    return { ok: true, message: "Invoice reopened." };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to reopen invoice." };
  }
}
