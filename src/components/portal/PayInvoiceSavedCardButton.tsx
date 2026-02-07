"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";
import { payInvoiceWithDefaultCardAction } from "@/lib/server-actions/billing";
import { waitForInvoicePaidAction } from "@/lib/server-actions/poll";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PayInvoiceSavedCardButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function pay() {
    startTransition(() => {
      void (async () => {
        const t = toast.loading("Processing payment...");

        try {
          const res = await payInvoiceWithDefaultCardAction(invoiceId);

          if (!res.ok) {
            toast.dismiss(t);
            toast.error(res.error);
            return;
          }

          // Already succeeded server-side
          if (res.data.status === "succeeded") {
            toast.dismiss(t);
            toast.success("Paid successfully.");

            await waitForInvoicePaidAction(invoiceId);
            router.refresh();
            return;
          }

          // Requires 3DS / action
          const clientSecret = res.data.clientSecret;
          if (!clientSecret) {
            toast.dismiss(t);
            toast.error("Missing client secret for authentication.");
            return;
          }

          const stripe = await stripePromise;
          if (!stripe) {
            toast.dismiss(t);
            toast.error("Stripe failed to load.");
            return;
          }

          const confirmRes = await stripe.confirmCardPayment(clientSecret);

          if (confirmRes.error) {
            toast.dismiss(t);
            toast.error(confirmRes.error.message ?? "Authentication failed.");
            return;
          }

          toast.dismiss(t);
          toast.success("Payment confirmed.");

          await waitForInvoicePaidAction(invoiceId);
          router.refresh();
        } catch (e: any) {
          toast.dismiss(t);
          toast.error(e?.message ?? "Payment failed.");
        }
      })();
    });
  }

  return (
    <Button type="button" variant="secondary" onClick={pay} disabled={isPending}>
      {isPending ? "Paying..." : "Pay with saved card"}
    </Button>
  );
}