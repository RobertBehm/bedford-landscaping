"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  deletePaymentMethodAction,
  setDefaultPaymentMethodAction,
} from "@/lib/server-actions/billing";

export type PaymentMethodRow = {
  id: string;
  stripePaymentMethodId: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
};

export default function PaymentMethodsClient({ methods }: { methods: PaymentMethodRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setDefault(pmId: string) {
    startTransition(() => {
      // IMPORTANT: this callback must return void
      void (async () => {
        const t = toast.loading("Setting default card...");
        try {
          const res = await setDefaultPaymentMethodAction(pmId);
          toast.dismiss(t);

          if (!res.ok) {
            toast.error(res.error);
            return;
          }

          toast.success(res.message ?? "Default updated.");
          router.refresh();
        } catch (e: any) {
          toast.dismiss(t);
          toast.error(e?.message ?? "Failed to set default card.");
        }
      })();
    });
  }

  function remove(pmId: string) {
    startTransition(() => {
      // IMPORTANT: this callback must return void
      void (async () => {
        const t = toast.loading("Removing card...");
        try {
          const res = await deletePaymentMethodAction(pmId);
          toast.dismiss(t);

          if (!res.ok) {
            toast.error(res.error);
            return;
          }

          toast.success(res.message ?? "Card removed.");
          router.refresh();
        } catch (e: any) {
          toast.dismiss(t);
          toast.error(e?.message ?? "Failed to remove card.");
        }
      })();
    });
  }

  return (
    <div className="space-y-2">
      {methods.map((m) => (
        <div key={m.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
          <div className="text-sm min-w-0">
            <div className="font-medium truncate">
              {(m.brand ? m.brand.toUpperCase() : "CARD") + " •••• " + (m.last4 ?? "----")}
              {m.isDefault ? (
                <span className="ml-2 text-xs text-muted-foreground">(default)</span>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              Exp {m.expMonth ?? "--"}/{m.expYear ?? "----"}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {!m.isDefault ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDefault(m.stripePaymentMethodId)}
                disabled={isPending}
              >
                Make default
              </Button>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              onClick={() => remove(m.stripePaymentMethodId)}
              disabled={isPending}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}

      <div className="text-xs text-muted-foreground">
        TODO: If default card is removed, auto-select newest remaining as default.
      </div>
    </div>
  );
}