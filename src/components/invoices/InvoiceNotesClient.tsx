"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createInvoiceNoteAction } from "@/lib/server-actions/invoice-notes";

export type InvoiceNoteChannel = "CALL" | "TEXT" | "EMAIL" | "IN_PERSON" | "OTHER";

const CHANNELS: { value: InvoiceNoteChannel; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "TEXT", label: "Text" },
  { value: "EMAIL", label: "Email" },
  { value: "IN_PERSON", label: "In person" },
  { value: "OTHER", label: "Other" },
];

export type InvoiceNoteRow = {
  id: string;
  createdAtIso: string;
  channel: InvoiceNoteChannel;
  body: string;
};

export default function InvoiceNotesClient({
  invoiceId,
  notes,
}: {
  invoiceId: string;
  notes: InvoiceNoteRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<InvoiceNoteChannel>("TEXT");
  const [body, setBody] = useState("");

  const notesSorted = useMemo(() => {
    // notes already should be sorted desc, but enforce
    return [...notes].sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
  }, [notes]);

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Write a reminder note first.");
      return;
    }

    const fd = new FormData();
    fd.set("invoiceId", invoiceId);
    fd.set("channel", channel);
    fd.set("body", trimmed);

    startTransition(async (): Promise<void> => {
      const loadingId = toast.loading("Saving reminder note...");
      const res = await createInvoiceNoteAction(fd);
      toast.dismiss(loadingId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
      setBody("");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium">Log a reminder</div>

          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as InvoiceNoteChannel)}
            className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={isPending}
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Example: Texted client—reminded invoice #1023 is overdue. Offered card payment over phone."
          className="min-h-[90px]"
          disabled={isPending}
        />

        <div className="flex items-center justify-end">
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Saving..." : "Save reminder"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          TODO: Add “Send invoice/reminder” actions (email/SMS) and auto-log notes via cron later.
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Reminder history</div>

        {notesSorted.length === 0 ? (
          <div className="text-sm text-muted-foreground">No reminders logged yet.</div>
        ) : (
          <div className="space-y-2">
            {notesSorted.map((n) => (
              <div key={n.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {n.createdAtIso.slice(0, 10)} {n.createdAtIso.slice(11, 16)}
                  </div>
                  <div className="text-xs rounded-md border px-2 py-0.5">
                    {n.channel}
                  </div>
                </div>
                <div className="mt-2 text-sm whitespace-pre-wrap">{n.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
