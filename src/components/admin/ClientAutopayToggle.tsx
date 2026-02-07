"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setClientAutopayAction } from "@/lib/server-actions/client-autopay";

export default function ClientAutopayToggle({
  clientId,
  enabled,
  hasDefaultCard,
}: {
  clientId: string;
  enabled: boolean;
  hasDefaultCard: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(() => {
      void (async () => {
        if (next && !hasDefaultCard) {
          toast.error("Client has no default card. They must add a card in the portal first.");
          return;
        }

        const t = toast.loading(next ? "Enabling autopay..." : "Disabling autopay...");
        const res = await setClientAutopayAction(clientId, next);
        toast.dismiss(t);

        if (!res.ok) {
          toast.error(res.error);
          return;
        }

        toast.success(res.message ?? "Updated.");
        router.refresh();
      })();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <div className="font-medium">Autopay</div>
        <div className="text-xs text-muted-foreground">
          Charge the client’s default card automatically when an invoice is created.
          <span className="ml-2">
            TODO: Add retry rules + email/text on failure later.
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {enabled ? (
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => toggle(false)}>
            {isPending ? "Saving..." : "Disable"}
          </Button>
        ) : (
          <Button type="button" disabled={isPending} onClick={() => toggle(true)}>
            {isPending ? "Saving..." : "Enable"}
          </Button>
        )}
      </div>
    </div>
  );
}