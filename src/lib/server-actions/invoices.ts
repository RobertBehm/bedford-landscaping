// src/lib/server-actions/invoices.ts
"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { stripe } from "@/lib/stripe";

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
 * TODO:
 * - Replace number allocation with a dedicated counter table for concurrency safety.
 * - Add retry rules + cron later for failed autopay attempts.
 * - Add invoice reminder engine later.
 * - Invoicing should eventually write to ledger (payments/adjustments) instead of single amountPaidCents.
 */
export async function createInvoiceAction(
  fd: FormData
): Promise<ActionResult<{ invoiceId: string }>> {
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
        clientId: true,
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
      },
      select: { id: true },
    });

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "INVOICED" },
    });

    // ✅ Optional: attempt autopay immediately if enabled + default card exists
    // NOTE: This is “best effort” — if it requires 3DS it’ll fail and client must pay via portal.
    const client = await prisma.client.findUnique({
      where: { id: job.clientId },
      select: { id: true, autopayEnabled: true, stripeCustomerId: true },
    });

    if (client?.autopayEnabled && client.stripeCustomerId && totalCents > 0) {
      const defaultPm = await prisma.clientPaymentMethod.findFirst({
        where: { clientId: client.id, isDefault: true },
        select: { stripePaymentMethodId: true },
      });

      if (defaultPm?.stripePaymentMethodId) {
        try {
          const intent = await stripe.paymentIntents.create({
            amount: totalCents,
            currency: "usd",
            customer: client.stripeCustomerId,
            payment_method: defaultPm.stripePaymentMethodId,
            off_session: true,
            confirm: true,
            metadata: {
              invoiceId: invoice.id,
              clientId: client.id,
              reason: "autopay_on_invoice_create",
            },
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: "never",
            },
          });

          if (intent.status === "succeeded") {
            const amountReceived = intent.amount_received ?? intent.amount;
            const chargeId =
              typeof intent.latest_charge === "string"
                ? intent.latest_charge
                : intent.latest_charge?.id;

            await prisma.$transaction(async (tx) => {
              // NOTE: assumes you have Payment model (your webhook uses tx.payment)
              await tx.payment.upsert({
                where: { stripePaymentIntentId: intent.id },
                create: {
                  invoiceId: invoice.id,
                  status: "SUCCEEDED",
                  amountCents: amountReceived,
                  currency: (intent.currency ?? "usd").toLowerCase(),
                  method: "CARD",
                  stripePaymentIntentId: intent.id,
                  stripeChargeId: chargeId ?? null,
                  rawEventId: "autopay_create_invoice", // TODO: replace w/ actual webhook event id later
                },
                update: {
                  status: "SUCCEEDED",
                  amountCents: amountReceived,
                  currency: (intent.currency ?? "usd").toLowerCase(),
                  method: "CARD",
                  stripeChargeId: chargeId ?? undefined,
                  rawEventId: "autopay_create_invoice",
                  failureCode: null,
                  failureMessage: null,
                },
              });

              await tx.invoice.update({
                where: { id: invoice.id },
                data: {
                  paidAt: new Date(),
                  amountPaidCents: totalCents,
                  paymentMethod: "CARD",
                },
              });

              await tx.job.update({
                where: { id: job.id },
                data: { status: "PAID" },
              });

              await tx.invoiceNote.create({
                data: {
                  invoiceId: invoice.id,
                  channel: "OTHER",
                  body: "Autopay succeeded (charged default card on invoice creation).",
                },
              });
            });

            return {
              ok: true,
              message: "Invoice created and autopay succeeded.",
              data: { invoiceId: invoice.id },
            };
          }

          // Autopay tried but needs action (3DS) or other state
          await prisma.invoiceNote.create({
            data: {
              invoiceId: invoice.id,
              channel: "OTHER",
              body:
                "Autopay attempted but requires customer authentication (3DS). Client must pay via portal.",
            },
          });
        } catch (err: any) {
          await prisma.invoiceNote.create({
            data: {
              invoiceId: invoice.id,
              channel: "OTHER",
              body: `Autopay failed: ${err?.message ?? "Unknown error"}`,
            },
          });

          // TODO: Admin alert + client email/text later.
        }
      } else {
        await prisma.invoiceNote.create({
          data: {
            invoiceId: invoice.id,
            channel: "OTHER",
            body: "Autopay enabled, but no default card on file. Skipped autopay.",
          },
        });
      }
    }

    return { ok: true, message: "Invoice created.", data: { invoiceId: invoice.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to create invoice." };
  }
}

/**
 * Mark invoice paid manually (admin).
 *
 * TODO:
 * - Replace amountPaidCents/paidAt with ledger entries for partials + multiple payments.
 * - Add audit log later.
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

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAt: new Date(),
          paymentMethod: paymentMethod as any,
          amountPaidCents,
        },
      });

      await tx.job.update({
        where: { id: invoice.jobId },
        data: { status: "PAID", actualPriceCents: amountPaidCents },
      });

      await tx.invoiceNote.create({
        data: {
          invoiceId: invoice.id,
          channel: "OTHER",
          body: `Marked paid manually via admin. Method: ${paymentMethod}. Amount: $${(
            amountPaidCents / 100
          ).toFixed(2)}`,
        },
      });
    });

    return { ok: true, message: "Invoice marked paid." };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to mark paid." };
  }
}

/**
 * Reopen invoice (admin).
 *
 * TODO:
 * - Add permission checks by org/team roles.
 * - If Stripe payment exists, consider warning/locking.
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

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAt: null, paymentMethod: null, amountPaidCents: 0 },
      });

      await tx.job.update({
        where: { id: invoice.jobId },
        data: { status: "INVOICED" },
      });

      await tx.invoiceNote.create({
        data: {
          invoiceId: invoice.id,
          channel: "OTHER",
          body: "Invoice reopened (paidAt cleared).",
        },
      });
    });

    return { ok: true, message: "Invoice reopened." };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to reopen invoice." };
  }
}