"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { createSetupIntentAction } from "@/lib/server-actions/billing";
import { waitForPaymentMethodSavedAction } from "@/lib/server-actions/poll";

import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function SaveCardForm() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await createSetupIntentAction();
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
  }, []);

  if (!clientSecret) {
    return <div className="text-sm text-muted-foreground">Loading card form…</div>;
  }

  return (
    <Card className="p-4">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <InnerSave />
      </Elements>
    </Card>
  );
}

function InnerSave() {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!stripe || !elements) return;

    startTransition(() => {
      void (async () => {
        const t = toast.loading("Saving card...");

        const res = await stripe.confirmSetup({
          elements,
          redirect: "if_required",
        });

        if (res.error) {
          toast.dismiss(t);
          toast.error(res.error.message ?? "Failed to save card.");
          return;
        }

        toast.dismiss(t);
        toast.success("Card confirmed.");

        // Stripe.js gives us the SetupIntent; grab payment_method id for precise polling.
        const pm =
          typeof res.setupIntent?.payment_method === "string"
            ? res.setupIntent?.payment_method
            : res.setupIntent?.payment_method?.id;

        if (pm) {
          await waitForPaymentMethodSavedAction(pm);
        }

        // ✅ refresh server data so saved card list appears immediately
        router.refresh();

        // TODO: Optionally clear the form by creating a new SetupIntent after saving.
      })();
    });
  }

  return (
    <div className="space-y-3">
      <PaymentElement />
      <Button type="button" onClick={save} disabled={isPending || !stripe || !elements}>
        {isPending ? "Saving..." : "Save card"}
      </Button>

      <div className="text-xs text-muted-foreground">
        TODO: Add billing address fields + name on card later.
      </div>
    </div>
  );
}