"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createInvoicePaymentIntentAction } from "@/lib/server-actions/payments";
import { waitForInvoicePaidAction } from "@/lib/server-actions/poll";

import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PayInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await createInvoicePaymentIntentAction(invoiceId);
      if (!mounted) return;

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      setClientSecret(res.data.clientSecret);
    })();

    return () => {
      mounted = false;
    };
  }, [invoiceId]);

  if (!clientSecret) {
    return <div className="text-sm text-muted-foreground">Loading payment form…</div>;
  }

  return (
    <Card className="p-4">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <InnerPay invoiceId={invoiceId} />
      </Elements>
    </Card>
  );
}

function InnerPay({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!stripe || !elements) return;

    startTransition(() => {
      void (async () => {
        const t = toast.loading("Paying invoice...");

        const result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            // If you enable redirect-based methods later, you MUST set return_url:
            // return_url: `${window.location.origin}/portal/invoices`,
          },
          redirect: "if_required",
        });

        if (result.error) {
          toast.dismiss(t);
          toast.error(result.error.message ?? "Payment failed.");
          return;
        }

        toast.dismiss(t);
        toast.success("Payment confirmed.");

        // ✅ Wait briefly for webhook → DB write, then refresh
        const wait = await waitForInvoicePaidAction(invoiceId);
        if (!wait.ok) {
          toast.error(wait.error);
        }

        router.refresh();

        // TODO: Optionally redirect back to invoices after success:
        // router.push("/portal/invoices");
      })();
    });
  }

  return (
    <div className="space-y-3">
      <PaymentElement />
      <Button type="button" onClick={submit} disabled={isPending || !stripe || !elements}>
        {isPending ? "Processing..." : "Pay now"}
      </Button>

      <div className="text-xs text-muted-foreground">
        TODO: Add “save card for future payments” checkbox later.
      </div>
    </div>
  );
}