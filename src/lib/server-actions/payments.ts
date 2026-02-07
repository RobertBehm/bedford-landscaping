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
 * Create a PaymentIntent for a portal invoice payment.
 *
 * ✅ Important: set automatic_payment_methods.allow_redirects="never"
 * so Stripe won’t require return_url for redirect-capable methods.
 *
 * TODO: Support partial payments later (charge amountDue, write ledger).
 * TODO: Add receipt emails later.
 */
export async function createInvoicePaymentIntentAction(
  invoiceId: string
): Promise<ActionResult<{ clientSecret: string }>> {
  try {
    const { clientId } = await requireClientUser();

    // sanity check publishable key exists (client depends on it)
    assertEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

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

    const intent = await stripe.paymentIntents.create({
      amount: amountDue,
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        invoiceId: invoice.id,
        clientId: client.id,
      },

      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    if (!intent.client_secret) {
      return { ok: false, error: "Failed to create payment intent (missing client secret)." };
    }

    return { ok: true, data: { clientSecret: intent.client_secret } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to create payment intent." };
  }
}