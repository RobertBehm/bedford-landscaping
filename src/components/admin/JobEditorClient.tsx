"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

import { createJobAction, updateJobAction } from "@/lib/server-actions/jobs";

export type JobStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "DONE"
  | "INVOICED"
  | "PAID"
  | "CANCELED";

const STATUSES: JobStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "DONE",
  "INVOICED",
  "PAID",
  "CANCELED",
];

export type ClientAddressOption = {
  id: string;
  label: string | null;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  isPrimary: boolean;
};

export type JobEditorMode = "create" | "edit";

export default function JobEditorClient({
  mode,
  job,
  client,
  addresses,
}: {
  mode: JobEditorMode;
  job:
    | {
        id: string;
        clientId: string;
        leadId: string | null;

        title: string;
        notes: string | null;
        status: JobStatus;

        scheduledStartIso: string | null;
        scheduledEndIso: string | null;

        estimatedPriceCents: number | null;
        actualPriceCents: number | null;

        addressId: string | null;
      }
    | null;
  client: { id: string; name: string };
  addresses: ClientAddressOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialAddressId = useMemo(() => {
    if (job?.addressId) return job.addressId;
    const primary = addresses.find((a) => a.isPrimary);
    return primary?.id ?? "";
  }, [job?.addressId, addresses]);

  const [title, setTitle] = useState(job?.title ?? "");
  const [notes, setNotes] = useState(job?.notes ?? "");
  const [status, setStatus] = useState<JobStatus>(job?.status ?? "DRAFT");
  const [addressId, setAddressId] = useState(initialAddressId);

  const [scheduledStart, setScheduledStart] = useState(job?.scheduledStartIso ?? "");
  const [scheduledEnd, setScheduledEnd] = useState(job?.scheduledEndIso ?? "");

  const [estimatedPrice, setEstimatedPrice] = useState(
    job?.estimatedPriceCents != null ? String(job.estimatedPriceCents / 100) : ""
  );
  const [actualPrice, setActualPrice] = useState(
    job?.actualPriceCents != null ? String(job.actualPriceCents / 100) : ""
  );

  function buildFormData() {
    const fd = new FormData();
    fd.set("clientId", client.id);
    fd.set("title", title);
    fd.set("notes", notes);
    fd.set("status", status);
    fd.set("addressId", addressId);

    // datetime-local expects something like 2026-02-05T14:30 (local time)
    fd.set("scheduledStart", scheduledStart);
    fd.set("scheduledEnd", scheduledEnd);

    fd.set("estimatedPrice", estimatedPrice);
    fd.set("actualPrice", actualPrice);

    if (job?.leadId) fd.set("leadId", job.leadId);

    return fd;
  }

  function save() {
    if (!title.trim()) {
      toast.error("Job title is required.");
      return;
    }

    startTransition(async () => {
      const loadingId = toast.loading(mode === "create" ? "Creating job..." : "Saving job...");

      try {
        const fd = buildFormData();

        if (mode === "create") {
          const res = await createJobAction(fd);

          toast.dismiss(loadingId);

          if (!res.ok) {
            toast.error(res.error);
            return;
          }

          toast.success(res.message);

          const jobId = res.data?.jobId;
          if (jobId) {
            router.push(`/admin/jobs/${jobId}`);
          } else {
            router.push(`/admin/jobs`);
          }
          router.refresh();
          return;
        }

        // edit mode
        fd.set("jobId", job!.id);
        const res = await updateJobAction(fd);

        toast.dismiss(loadingId);

        if (!res.ok) {
          toast.error(res.error);
          return;
        }

        toast.success(res.message);
        router.refresh();
      } catch (e) {
        toast.dismiss(loadingId);
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const addrLabel = (a: ClientAddressOption) => {
    const parts = [a.label ? `${a.label}:` : null, a.address, a.city, a.state, a.zip].filter(Boolean);
    return parts.join(" ");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{mode === "create" ? "Create Job" : "Edit Job"}</CardTitle>
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <div className="text-xs text-muted-foreground">Client</div>
              <Input value={client.name} readOnly />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <div className="text-xs text-muted-foreground">Job title</div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekly lawn mow, Spring cleanup, Mulch install"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Address</div>
              <select
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              >
                <option value="">(No address)</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.isPrimary ? "⭐ " : ""}
                    {addrLabel(a)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Scheduled start</div>
              <Input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Scheduled end</div>
              <Input
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Estimated price (USD)</div>
              <Input
                inputMode="decimal"
                value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(e.target.value)}
                placeholder="e.g., 65"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Actual price (USD)</div>
              <Input
                inputMode="decimal"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                placeholder="e.g., 65"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Internal notes</div>
            <Textarea
              className="min-h-[120px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate code, dog notes, special instructions, what was done..."
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
