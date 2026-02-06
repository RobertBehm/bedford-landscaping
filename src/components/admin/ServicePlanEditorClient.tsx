"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

import {
  createServicePlanAction,
  updateServicePlanAction,
  setServicePlanStatusAction,
} from "@/lib/server-actions/service-plans";

import GenerateJobsButtonClient from "@/components/admin/GenerateJobsButtonClient";

type PlanStatus = "ACTIVE" | "PAUSED" | "CANCELED";
type PlanFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

const STATUSES: PlanStatus[] = ["ACTIVE", "PAUSED", "CANCELED"];
const FREQUENCIES: PlanFrequency[] = ["WEEKLY", "BIWEEKLY", "MONTHLY"];

type Addr = {
  id: string;
  label: string | null;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  isPrimary: boolean;
};

export type ServicePlanEditorMode = "create" | "edit";

export default function ServicePlanEditorClient({
  mode,
  plan,
  client,
  addresses,
}: {
  mode: ServicePlanEditorMode;
  plan:
    | {
        id: string;
        clientId: string;
        title: string;
        notes: string | null;
        status: PlanStatus;
        frequency: PlanFrequency;
        startDate: string; // YYYY-MM-DD
        endDate: string; // YYYY-MM-DD or ""
        dayOfWeek: number | null;
        dayOfMonth: number | null;
        pricePerVisitCents: number | null;
        addressId: string | null;
      }
    | null;
  client: { id: string; name: string };
  addresses: Addr[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const initialAddressId = useMemo(() => {
    if (plan?.addressId) return plan.addressId;
    const primary = addresses.find((a) => a.isPrimary);
    return primary?.id ?? "";
  }, [plan?.addressId, addresses]);

  const [title, setTitle] = useState(plan?.title ?? "");
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [status, setStatus] = useState<PlanStatus>(plan?.status ?? "ACTIVE");
  const [frequency, setFrequency] = useState<PlanFrequency>(plan?.frequency ?? "WEEKLY");
  const [addressId, setAddressId] = useState(initialAddressId);

  const [startDate, setStartDate] = useState(plan?.startDate ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(plan?.endDate ?? "");

  const [dayOfWeek, setDayOfWeek] = useState<string>(plan?.dayOfWeek != null ? String(plan.dayOfWeek) : "");
  const [dayOfMonth, setDayOfMonth] = useState<string>(plan?.dayOfMonth != null ? String(plan.dayOfMonth) : "");

  const [pricePerVisit, setPricePerVisit] = useState(
    plan?.pricePerVisitCents != null ? String(plan.pricePerVisitCents / 100) : ""
  );

  function addrLabel(a: Addr) {
    const parts = [a.label ? `${a.label}:` : null, a.address, a.city, a.state, a.zip].filter(Boolean);
    return parts.join(" ");
  }

  function buildFD() {
    const fd = new FormData();
    fd.set("clientId", client.id);
    fd.set("title", title);
    fd.set("notes", notes);
    fd.set("status", status);
    fd.set("frequency", frequency);
    fd.set("addressId", addressId);

    fd.set("startDate", startDate);
    fd.set("endDate", endDate);

    fd.set("dayOfWeek", dayOfWeek);
    fd.set("dayOfMonth", dayOfMonth);

    fd.set("pricePerVisit", pricePerVisit);

    return fd;
  }

  function save() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!startDate) {
      toast.error("Start date is required.");
      return;
    }

    // Light validation
    if ((frequency === "WEEKLY" || frequency === "BIWEEKLY") && dayOfWeek) {
      const n = Number(dayOfWeek);
      if (!Number.isFinite(n) || n < 0 || n > 6) {
        toast.error("Day of week must be 0..6.");
        return;
      }
    }
    if (frequency === "MONTHLY" && dayOfMonth) {
      const n = Number(dayOfMonth);
      if (!Number.isFinite(n) || n < 1 || n > 31) {
        toast.error("Day of month must be 1..31.");
        return;
      }
    }

    start(async () => {
      const loading = toast.loading(mode === "create" ? "Creating plan..." : "Saving plan...");

      try {
        const fd = buildFD();

        if (mode === "create") {
          const res = await createServicePlanAction(fd);
          toast.dismiss(loading);

          if (!res.ok) {
            toast.error(res.error);
            return;
          }

          toast.success(res.message);

          const id = res.data?.id;
          // TODO: Instead of reload, use router.refresh once all pages are stable.
          if (id) router.push(`/admin/plans/${id}`);
          else router.push(`/admin/plans`);
          router.refresh();
          return;
        }

        fd.set("id", plan!.id);
        const res = await updateServicePlanAction(fd);
        toast.dismiss(loading);

        if (!res.ok) {
          toast.error(res.error);
          return;
        }

        toast.success(res.message);
        router.refresh();
      } catch (e) {
        toast.dismiss(loading);
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function setStatusNext(next: PlanStatus) {
    if (!plan?.id) return;

    start(async () => {
      const loading = toast.loading("Updating status...");
      const fd = new FormData();
      fd.set("id", plan.id);
      fd.set("status", next);

      const res = await setServicePlanStatusAction(fd);
      toast.dismiss(loading);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {mode === "create" ? "Create Service Plan" : "Edit Service Plan"}
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            {mode === "edit" && plan?.id ? (
              <>
                <GenerateJobsButtonClient planId={plan.id} />
                {/* TODO: Add "Generate next 30 days" / "Backfill" options */}
              </>
            ) : null}

            <Button onClick={save} disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <div className="text-xs text-muted-foreground">Client</div>
              <Input value={client.name} readOnly />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <div className="text-xs text-muted-foreground">Plan title</div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekly Lawn Mow"
                disabled={pending}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PlanStatus)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={pending}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {mode === "edit" && plan?.id ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {/* TODO: Confirm dialogs before canceling plans */}
                  <Button type="button" variant="secondary" size="sm" onClick={() => setStatusNext("ACTIVE")}>
                    Activate
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setStatusNext("PAUSED")}>
                    Pause
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setStatusNext("CANCELED")}>
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Frequency</div>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PlanFrequency)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={pending}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <div className="text-xs text-muted-foreground">Address</div>
              <select
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={pending}
              >
                <option value="">(No address)</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.isPrimary ? "⭐ " : ""}
                    {addrLabel(a)}
                  </option>
                ))}
              </select>
              {/* TODO: Add “Add address” inline drawer later */}
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Start date</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={pending} />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">End date (optional)</div>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={pending} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">
                Day of week (0=Sun..6=Sat) — Weekly/Biweekly
              </div>
              <Input
                inputMode="numeric"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                placeholder="(optional)"
                disabled={pending}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Day of month (1..31) — Monthly</div>
              <Input
                inputMode="numeric"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                placeholder="(optional)"
                disabled={pending}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Price per visit (USD)</div>
            <Input
              inputMode="decimal"
              value={pricePerVisit}
              onChange={(e) => setPricePerVisit(e.target.value)}
              placeholder="e.g., 65"
              disabled={pending}
            />
            {/* TODO: Add discounts, seasonal pricing, upsells, per-visit line items */}
          </div>

          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Internal notes</div>
            <Textarea
              className="min-h-[120px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate code, special instructions, equipment notes..."
              disabled={pending}
            />
          </div>

          <div className="rounded-lg border p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">MVP limitations</div>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Jobs generate at an approximate 9am New York time.</li>
              <li>Monthly plans skip invalid dates (e.g., Feb 30).</li>
              <li>Deduping is based on planId + scheduledStart.</li>
            </ul>
            {/* TODO: Add true timezone/DST scheduling and robust recurrence IDs */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
