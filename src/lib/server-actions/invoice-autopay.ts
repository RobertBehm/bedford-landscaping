"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { stripe } from "@/lib/stripe";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data: T }
  | { ok: false; error: string };

export async function chargeInvoiceWithDefaultCardAdminAction(
  invoiceId: string
): Promise<
  ActionResult<{
    status: "succeeded" | "requires_action";
    stripePaymentIntentId?: string;
  }>
> {
  try {
    await requireOrgAdmin();

    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { job: { select: { id: true, clientId: true } } },
    });

    if (!invoice) return { ok: false, error: "Invoice not found." };

    const amountDue = Math.max(0, invoice.totalCents - (invoice.amountPaidCents ?? 0));
    if (amountDue <= 0 || invoice.paidAt) {
      return { ok: true, message: "Invoice already paid.", data: { status: "succeeded" } };
    }

    const client = await prisma.client.findUnique({
      where: { id: invoice.job.clientId },
      select: { id: true, stripeCustomerId: true },
    });

    if (!client?.stripeCustomerId) {
      return {
        ok: false,
        error: "Client has no Stripe customer. They must add a card in the portal first.",
      };
    }

    const defaultPm = await prisma.clientPaymentMethod.findFirst({
      where: { clientId: client.id, isDefault: true },
      select: { stripePaymentMethodId: true },
    });

    if (!defaultPm?.stripePaymentMethodId) {
      return {
        ok: false,
        error: "No default card saved. Client must add a card in the portal first.",
      };
    }

    const intent = await stripe.paymentIntents.create({
      amount: amountDue,
      currency: "usd",
      customer: client.stripeCustomerId,
      payment_method: defaultPm.stripePaymentMethodId,
      off_session: true,
      confirm: true,

      metadata: {
        invoiceId: invoice.id,
        clientId: client.id,
      },

      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    if (
      intent.status === "requires_action" ||
      intent.status === "requires_confirmation" ||
      intent.status === "requires_payment_method"
    ) {
      return {
        ok: true,
        message: "Card requires authentication. Client must pay from the portal.",
        data: { status: "requires_action", stripePaymentIntentId: intent.id },
      };
    }

    if (intent.status !== "succeeded") {
      return { ok: false, error: `Charge failed with status: ${intent.status}` };
    }

    // ✅ Update DB now so admin UI updates immediately (webhook is still fine/idempotent)
    const amountReceived = intent.amount_received ?? intent.amount;
    const chargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id;

    await prisma.$transaction(async (tx) => {
      // NOTE: assumes you have Payment model since your webhook is upserting tx.payment
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
          rawEventId: "admin_charge", // TODO: store real webhook event id when received
        },
        update: {
          status: "SUCCEEDED",
          amountCents: amountReceived,
          currency: (intent.currency ?? "usd").toLowerCase(),
          method: "CARD",
          stripeChargeId: chargeId ?? undefined,
          rawEventId: "admin_charge",
          failureCode: null,
          failureMessage: null,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAt: new Date(),
          amountPaidCents: invoice.totalCents,
          paymentMethod: "CARD",
        },
      });

      await tx.job.update({
        where: { id: invoice.job.id },
        data: { status: "PAID" },
      });
    });

    return {
      ok: true,
      message: "Charged successfully.",
      data: { status: "succeeded", stripePaymentIntentId: intent.id },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to charge invoice." };
  }
}