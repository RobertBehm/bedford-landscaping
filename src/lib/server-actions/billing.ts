"use server";

import { prisma } from "@/lib/db";
import { requireClientUser } from "@/lib/client-auth";
import { stripe } from "@/lib/stripe";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data: T }
  | { ok: false; error: string };

function assertEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

/**
 * Create a SetupIntent for saving a card (PaymentElement).
 *
 * ✅ Uses allow_redirects="never" so no return_url is needed.
 *
 * TODO: Add billing address collection later.
 * TODO: Add autopay toggle later.
 */
export async function createSetupIntentAction(): Promise<ActionResult<{ clientSecret: string }>> {
  try {
    const { clientId } = await requireClientUser();

    // sanity check publishable key exists (client depends on it)
    assertEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, email: true, stripeCustomerId: true },
    });

    if (!client) return { ok: false, error: "Client not found." };

    let stripeCustomerId = client.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const cust = await stripe.customers.create({
        name: client.name,
        email: client.email ?? undefined,
        metadata: { clientId: client.id },
      });

      stripeCustomerId = cust.id;

      await prisma.client.update({
        where: { id: client.id },
        data: { stripeCustomerId },
      });
    }

    const si = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: "off_session",
      metadata: { clientId: client.id },

      // ✅ Important: prevent redirect-based methods so return_url isn’t required.
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    if (!si.client_secret) {
      return { ok: false, error: "Failed to create setup intent (missing client secret)." };
    }

    return { ok: true, data: { clientSecret: si.client_secret } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to create setup intent." };
  }
}

/**
 * Charge the default saved card for an invoice.
 *
 * TODO: Support picking a non-default card later.
 * TODO: Support partial payments later.
 */
export async function payInvoiceWithDefaultCardAction(
  invoiceId: string
): Promise<ActionResult<{ status: "succeeded" | "requires_action"; clientSecret?: string }>> {
  try {
    const { clientId } = await requireClientUser();

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { job: { select: { clientId: true } } },
    });

    if (!invoice) return { ok: false, error: "Invoice not found." };
    if (invoice.job.clientId !== clientId) return { ok: false, error: "Not authorized." };

    const amountDue = Math.max(0, invoice.totalCents - (invoice.amountPaidCents ?? 0));
    if (amountDue <= 0) return { ok: false, error: "Invoice is already paid." };

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, stripeCustomerId: true },
    });

    if (!client?.stripeCustomerId) {
      return { ok: false, error: "No Stripe customer on file. Add a card first." };
    }

    const defaultPm = await prisma.clientPaymentMethod.findFirst({
      where: { clientId, isDefault: true },
      select: { stripePaymentMethodId: true },
    });

    if (!defaultPm?.stripePaymentMethodId) {
      return { ok: false, error: "No default card saved. Add a card first." };
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

    if (intent.status === "succeeded") {
      // Webhook will update DB. Client UI refreshes.
      return { ok: true, data: { status: "succeeded" } };
    }

    if (intent.status === "requires_action" || intent.status === "requires_confirmation") {
      if (!intent.client_secret) {
        return { ok: false, error: "Missing client secret for authentication." };
      }
      return { ok: true, data: { status: "requires_action", clientSecret: intent.client_secret } };
    }

    return { ok: false, error: `Payment failed with status: ${intent.status}` };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Payment failed." };
  }
}

export async function setDefaultPaymentMethodAction(
  stripePaymentMethodId: string
): Promise<ActionResult<undefined>> {
  try {
    const { clientId } = await requireClientUser();

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { stripeCustomerId: true },
    });

    if (!client?.stripeCustomerId) {
      return { ok: false, error: "Missing Stripe customer." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.clientPaymentMethod.updateMany({
        where: { clientId },
        data: { isDefault: false },
      });

      await tx.clientPaymentMethod.updateMany({
        where: { clientId, stripePaymentMethodId },
        data: { isDefault: true },
      });
    });

    await stripe.customers.update(client.stripeCustomerId, {
      invoice_settings: { default_payment_method: stripePaymentMethodId },
    });

    return { ok: true, message: "Default card updated.", data: undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to set default card." };
  }
}

export async function deletePaymentMethodAction(
  stripePaymentMethodId: string
): Promise<ActionResult<undefined>> {
  try {
    const { clientId } = await requireClientUser();

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { stripeCustomerId: true },
    });

    if (!client?.stripeCustomerId) {
      return { ok: false, error: "Missing Stripe customer." };
    }

    await stripe.paymentMethods.detach(stripePaymentMethodId);

    await prisma.clientPaymentMethod.deleteMany({
      where: { clientId, stripePaymentMethodId },
    });

    // Ensure there is still a default if any remain
    const remaining = await prisma.clientPaymentMethod.findMany({
      where: { clientId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: { stripePaymentMethodId: true, isDefault: true },
    });

    if (remaining.length > 0 && !remaining.some((m) => m.isDefault)) {
      const newest = remaining[0]!;
      await prisma.clientPaymentMethod.updateMany({
        where: { clientId, stripePaymentMethodId: newest.stripePaymentMethodId },
        data: { isDefault: true },
      });

      await stripe.customers.update(client.stripeCustomerId, {
        invoice_settings: { default_payment_method: newest.stripePaymentMethodId },
      });
    }

    return { ok: true, message: "Card removed.", data: undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to remove card." };
  }
}