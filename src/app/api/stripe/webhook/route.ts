import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return new NextResponse("Missing stripe-signature", { status: 400 });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new NextResponse(`Webhook error: ${err.message}`, { status: 400 });
  }

  // ✅ Save card
  if (event.type === "setup_intent.succeeded") {
    const si = event.data.object as Stripe.SetupIntent;
    const clientId = si.metadata?.clientId;

    const paymentMethodId =
      typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;

    if (clientId && paymentMethodId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, stripeCustomerId: true },
      });

      // We expect this to exist because we created SetupIntent with customer
      if (client?.stripeCustomerId) {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

        const card = (pm as any).card;

        await prisma.$transaction(async (tx) => {
          // Mark all non-default, then upsert this one as default
          await tx.clientPaymentMethod.updateMany({
            where: { clientId },
            data: { isDefault: false },
          });

          await tx.clientPaymentMethod.upsert({
            where: { stripePaymentMethodId: paymentMethodId },
            create: {
              clientId,
              stripePaymentMethodId: paymentMethodId,
              brand: card?.brand ?? null,
              last4: card?.last4 ?? null,
              expMonth: card?.exp_month ?? null,
              expYear: card?.exp_year ?? null,
              isDefault: true,
            },
            update: {
              brand: card?.brand ?? undefined,
              last4: card?.last4 ?? undefined,
              expMonth: card?.exp_month ?? undefined,
              expYear: card?.exp_year ?? undefined,
              isDefault: true,
            },
          });
        });

        // Also set Stripe-side default
        await stripe.customers.update(client.stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });

        // TODO: Support multiple cards without forcing "newest becomes default".
      }
    }
  }

  // ✅ Invoice payment success
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = intent.metadata?.invoiceId;

    if (invoiceId) {
      const amount = intent.amount_received ?? intent.amount;
      const chargeId =
        typeof intent.latest_charge === "string"
          ? intent.latest_charge
          : intent.latest_charge?.id;

      await prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
          where: { stripePaymentIntentId: intent.id },
          create: {
            invoiceId,
            status: "SUCCEEDED",
            amountCents: amount,
            currency: (intent.currency ?? "usd").toLowerCase(),
            method: "CARD",
            stripePaymentIntentId: intent.id,
            stripeChargeId: chargeId ?? null,
            rawEventId: event.id,
          },
          update: {
            status: "SUCCEEDED",
            amountCents: amount,
            currency: (intent.currency ?? "usd").toLowerCase(),
            method: "CARD",
            stripeChargeId: chargeId ?? undefined,
            rawEventId: event.id,
            failureCode: null,
            failureMessage: null,
          },
        });

        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          select: { id: true, totalCents: true, paidAt: true, jobId: true },
        });

        if (!invoice) return;

        if (!invoice.paidAt) {
          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              paidAt: new Date(),
              amountPaidCents: invoice.totalCents,
              paymentMethod: "CARD",
            },
          });

          await tx.job.update({
            where: { id: invoice.jobId },
            data: { status: "PAID" },
          });
        }

        // TODO: Partial payments later: compute paid totals from ledger.
      });
    }
  }

  // ✅ Invoice payment failed
  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = intent.metadata?.invoiceId;

    if (invoiceId) {
      const lastErr = intent.last_payment_error;

      await prisma.payment.upsert({
        where: { stripePaymentIntentId: intent.id },
        create: {
          invoiceId,
          status: "FAILED",
          amountCents: intent.amount,
          currency: (intent.currency ?? "usd").toLowerCase(),
          method: "CARD",
          stripePaymentIntentId: intent.id,
          failureCode: lastErr?.code ?? null,
          failureMessage: lastErr?.message ?? "Payment failed.",
          rawEventId: event.id,
        },
        update: {
          status: "FAILED",
          failureCode: lastErr?.code ?? null,
          failureMessage: lastErr?.message ?? "Payment failed.",
          rawEventId: event.id,
        },
      });

      // TODO: Admin alert + client email later.
    }
  }

  return NextResponse.json({ received: true });
}