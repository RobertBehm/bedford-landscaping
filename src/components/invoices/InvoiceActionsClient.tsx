"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createInvoiceAction,
  markInvoicePaidAction,
  reopenInvoiceAction,
} from "@/lib/server-actions/invoices";

type PaymentMethod = "CASH" | "CHECK" | "CARD" | "ACH" | "OTHER";

const METHODS: PaymentMethod[] = ["CASH", "CHECK", "CARD", "ACH", "OTHER"];

export default function InvoiceActionsClient({
  jobId,
  invoice,
}: {
  jobId: string;
  invoice:
    | {
        id: string;
        number: number;
        totalCents: number;
        amountPaidCents: number;
        dueAtIso: string | null;
        paidAtIso: string | null;
        paymentMethod: PaymentMethod | null;
      }
    | null;
}) {
  const [isPending, startTransition] = useTransition();

  // datetime-local wants "YYYY-MM-DDTHH:mm"
  const [dueAt, setDueAt] = useState(invoice?.dueAtIso ? invoice.dueAtIso.slice(0, 16) : "");
  const [method, setMethod] = useState<PaymentMethod>(invoice?.paymentMethod ?? "CASH");
  const [amountPaid, setAmountPaid] = useState(
    invoice?.amountPaidCents ? String(invoice.amountPaidCents / 100) : ""
  );

  function createInvoice() {
    const fd = new FormData();
    fd.set("jobId", jobId);
    if (dueAt) fd.set("dueAt", dueAt);

    startTransition(async (): Promise<void> => {
      const loadingId = toast.loading("Creating invoice...");

      const res = await createInvoiceAction(fd);

      toast.dismiss(loadingId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);

      // IMPORTANT: don't "return" anything
      window.location.reload();
    });
  }

  function markPaid() {
    if (!invoice) return;

    const fd = new FormData();
    fd.set("invoiceId", invoice.id);
    fd.set("paymentMethod", method);
    fd.set("amountPaid", amountPaid);

    startTransition(async (): Promise<void> => {
      const loadingId = toast.loading("Marking paid...");

      const res = await markInvoicePaidAction(fd);

      toast.dismiss(loadingId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
      window.location.reload();
    });
  }

  function reopen() {
    if (!invoice) return;

    const fd = new FormData();
    fd.set("invoiceId", invoice.id);

    startTransition(async (): Promise<void> => {
      const loadingId = toast.loading("Reopening invoice...");

      const res = await reopenInvoiceAction(fd);

      toast.dismiss(loadingId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
      window.location.reload();
    });
  }

  if (!invoice) {
    return (
      <div className="space-y-3">
        <div className="grid gap-2">
          <div className="text-xs text-muted-foreground">Due date (optional)</div>
          <Input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            disabled={isPending}
          />
        </div>

        <Button onClick={createInvoice} disabled={isPending}>
          {isPending ? "Working..." : "Create Invoice"}
        </Button>

        <div className="text-xs text-muted-foreground">
          TODO: Add PDF generation + email invoice sending.
        </div>
      </div>
    );
  }

  const isPaid = Boolean(invoice.paidAtIso);

  return (
    <div className="space-y-4">
      {!isPaid ? (
        <>
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Payment method</div>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={isPending}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Amount paid (USD)</div>
            <Input
              inputMode="decimal"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={(invoice.totalCents / 100).toFixed(2)}
              disabled={isPending}
            />
          </div>

          <Button onClick={markPaid} disabled={isPending}>
            {isPending ? "Working..." : "Mark Paid"}
          </Button>

          <div className="text-xs text-muted-foreground">
            TODO: Support partial payments + multiple payments.
          </div>
        </>
      ) : (
        <>
          <div className="text-sm">
            <div className="font-medium">Paid</div>
            <div className="text-muted-foreground text-sm">
              Method: {invoice.paymentMethod ?? "—"} • Amount: $
              {(invoice.amountPaidCents / 100).toFixed(2)}
            </div>
          </div>

          <Button variant="secondary" onClick={reopen} disabled={isPending}>
            {isPending ? "Working..." : "Reopen Invoice"}
          </Button>

          <div className="text-xs text-muted-foreground">
            TODO: Add audit log of payment changes.
          </div>
        </>
      )}
    </div>
  );
}
