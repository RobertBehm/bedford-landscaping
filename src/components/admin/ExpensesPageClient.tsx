"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createExpenseAction, deleteExpenseAction } from "@/lib/server-actions/expenses";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export type ExpenseCategory =
  | "MATERIALS"
  | "FUEL"
  | "EQUIPMENT"
  | "REPAIRS"
  | "SUBCONTRACTOR"
  | "LABOR"
  | "MARKETING"
  | "SOFTWARE"
  | "INSURANCE"
  | "FEES"
  | "OTHER";

const CATEGORIES: ExpenseCategory[] = [
  "MATERIALS",
  "FUEL",
  "EQUIPMENT",
  "REPAIRS",
  "SUBCONTRACTOR",
  "LABOR",
  "MARKETING",
  "SOFTWARE",
  "INSURANCE",
  "FEES",
  "OTHER",
];

export type ClientOption = { id: string; name: string };
export type JobOption = { id: string; title: string };

export type ExpenseRow = {
  id: string;
  occurredAtIso: string;
  occurredAtDisplay: string;

  category: ExpenseCategory;
  vendor: string | null;
  memo: string | null;
  amountCents: number;

  client: { id: string; name: string } | null;
  job: { id: string; title: string } | null;
};

function usd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (cents ?? 0) / 100
  );
}

export default function ExpensesPageClient({
  rows,
  clients,
  jobs,
}: {
  rows: ExpenseRow[];
  clients: ClientOption[];
  jobs: JobOption[];
}) {
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
  const [occurredAt, setOccurredAt] = useState(""); // datetime-local
  const [vendor, setVendor] = useState("");
  const [memo, setMemo] = useState("");
  const [clientId, setClientId] = useState("");
  const [jobId, setJobId] = useState("");

  const totals = useMemo(() => {
    const sum = rows.reduce((acc, r) => acc + r.amountCents, 0);
    return { sum };
  }, [rows]);

  function create() {
    const fd = new FormData();
    fd.set("amount", amount);
    fd.set("category", category);
    fd.set("occurredAt", occurredAt);
    fd.set("vendor", vendor);
    fd.set("memo", memo);
    fd.set("clientId", clientId);
    fd.set("jobId", jobId);

    startTransition(async () => {
      const loadingId = toast.loading("Adding expense...");

      const res = await createExpenseAction(fd);

      toast.dismiss(loadingId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);

      // TODO: Instead of full refresh, switch to optimistic updates.
      window.location.reload();
    });
  }

  function remove(expenseId: string) {
    startTransition(async () => {
      const loadingId = toast.loading("Deleting expense...");

      const res = await deleteExpenseAction(expenseId);

      toast.dismiss(loadingId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Expenses</h2>
        <p className="text-sm text-muted-foreground">
          Track costs so profit reporting is real. TODO: add edit + receipts + vendor rollups.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Add expense</CardTitle>
          <Button onClick={create} disabled={isPending}>
            {isPending ? "Saving..." : "Add"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Amount (USD)</div>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 42.50"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Category</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Occurred at</div>
              <Input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                disabled={isPending}
              />
              <div className="text-[11px] text-muted-foreground">
                TODO: store timezone preference; right now we treat input as local time.
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Vendor</div>
              <Input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Home Depot, Irving, etc"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Client (optional)</div>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              >
                <option value="">(None)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Job (optional)</div>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              >
                <option value="">(None)</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Memo</div>
            <Textarea
              className="min-h-[90px]"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Notes about this expense..."
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Recent expenses</CardTitle>
          <div className="text-sm font-medium">{usd(totals.sum)} (shown)</div>
        </CardHeader>

        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No expenses yet.</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{usd(r.amountCents)}</div>
                    <div className="text-xs text-muted-foreground">{r.category}</div>
                    <div className="text-xs text-muted-foreground">{r.occurredAtDisplay}</div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {r.vendor ? r.vendor : "—"}
                    {r.client ? ` • ${r.client.name}` : ""}
                    {r.job ? ` • ${r.job.title}` : ""}
                  </div>
                  {r.memo ? (
                    <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{r.memo}</div>
                  ) : null}
                </div>

                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => remove(r.id)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              </div>
            ))
          )}

          <div className="text-xs text-muted-foreground">
            TODO: Add edit, receipts upload, and a “monthly summary by category” breakdown.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}