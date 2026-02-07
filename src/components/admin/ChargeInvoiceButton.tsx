"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { chargeInvoiceWithDefaultCardAdminAction } from "@/lib/server-actions/invoice-autopay";

export default function ChargeInvoiceButton({
  invoiceId,
  compact,
}: {
  invoiceId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function charge() {
    startTransition(() => {
      void (async () => {
        const t = toast.loading("Charging default card...");

        const res = await chargeInvoiceWithDefaultCardAdminAction(invoiceId);

        toast.dismiss(t);

        if (!res.ok) {
          toast.error(res.error);
          return;
        }

        if (res.data.status === "requires_action") {
          toast.message(
            "This card needs customer authentication (3DS). Ask the client to pay from the portal."
          );
          router.refresh();
          return;
        }

        toast.success(res.message ?? "Charged successfully.");
        router.refresh();
      })();
    });
  }

  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "secondary"}
      onClick={charge}
      disabled={isPending}
    >
      {isPending ? "Charging..." : compact ? "Charge" : "Charge default card"}
    </Button>
  );
}