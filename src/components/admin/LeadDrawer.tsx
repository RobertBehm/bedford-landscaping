"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import UpdateLeadStatusForm from "@/components/leads/UpdateLeadStatusForm";
import {
  addLeadNoteAction,
  getLeadThreadAction,
  type LeadThread,
} from "@/lib/server-actions/lead-thread";
import { createTaskAction, type ActionResult as TaskActionResult } from "@/lib/server-actions/tasks";
import TaskListClient, { type TaskRow } from "@/components/admin/TaskListClient";
import { convertLeadToClientAction } from "@/lib/server-actions/clients";

export type LeadSummaryForDrawer = {
  id: string;
  createdAtIso: string;
  createdAtDisplay: string;

  name: string;
  email: string | null;
  phone: string;
  city: string | null;
  state: string | null;

  service: string | null;
  message: string;
  status: any;
  sourceUrl: string | null;

  clientId?: string | null;
};

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function LeadDrawer({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: LeadSummaryForDrawer | null;
}) {
  const [isPending, startTransition] = useTransition();

  const [thread, setThread] = useState<LeadThread | null>(null);
  const [leadTasks, setLeadTasks] = useState<TaskRow[]>([]);
  const [noteBody, setNoteBody] = useState("");

  // task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskBody, setTaskBody] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [taskRecurrence, setTaskRecurrence] = useState<
    "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY"
  >("NONE");

  const [clientId, setClientId] = useState<string | null>(lead?.clientId ?? null);

  const leadId = lead?.id ?? null;

  async function fetchLeadTasks(id: string) {
    const res = await fetch(`/admin/api/lead-tasks?leadId=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load tasks.");
    const data = (await res.json()) as { tasks: TaskRow[] };
    setLeadTasks(data.tasks);
  }

  useEffect(() => {
    if (!open || !leadId) return;

    setThread(null);
    setLeadTasks([]);
    setNoteBody("");

    setTaskTitle("");
    setTaskBody("");
    setTaskPriority("MEDIUM");
    setTaskRecurrence("NONE");
    setTaskDueAt(toDatetimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));

    setClientId(lead?.clientId ?? null);

    startTransition(async () => {
      const loadingId = toast.loading("Loading lead...");
      try {
        const t = await getLeadThreadAction(leadId);
        setThread(t);
        await fetchLeadTasks(leadId);
        toast.dismiss(loadingId);
      } catch (e) {
        toast.dismiss(loadingId);
        toast.error(e instanceof Error ? e.message : "Failed to load lead.");
      }
    });
  }, [open, leadId]);

  const title = useMemo(() => thread?.lead?.name ?? lead?.name ?? "Lead", [thread, lead]);
  const createdAtDisplay = useMemo(() => lead?.createdAtDisplay ?? "", [lead]);

  const phone = thread?.lead?.phone ?? lead?.phone ?? "—";
  const email = thread?.lead?.email ?? lead?.email ?? null;
  const city = thread?.lead?.city ?? lead?.city ?? null;
  const state = thread?.lead?.state ?? lead?.state ?? null;
  const service = thread?.lead?.service ?? lead?.service ?? null;
  const message = thread?.lead?.message ?? lead?.message ?? "";
  const sourceUrl = thread?.lead?.sourceUrl ?? lead?.sourceUrl ?? null;

  const openTaskCount = leadTasks.filter((t) => !t.completedAtIso).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 h-[100dvh] overflow-hidden">
        <div className="flex h-full flex-col">
          <SheetHeader className="px-6 py-4 shrink-0">
            <SheetTitle className="text-lg">{title}</SheetTitle>
            {createdAtDisplay ? (
              <div className="text-sm text-muted-foreground">{createdAtDisplay}</div>
            ) : null}
          </SheetHeader>

          <Separator className="shrink-0" />

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-4 space-y-6">
                {/* Client */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Client</div>

                  {clientId ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        Converted ✅
                      </div>
                      <Button asChild variant="secondary" size="sm">
                        <a href={`/admin/clients/${clientId}`}>Open Client</a>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        Not converted yet
                      </div>
                      <Button
                        size="sm"
                        disabled={isPending || !leadId}
                        onClick={() => {
                          if (!leadId) return;
                          startTransition(async () => {
                            const loadingId = toast.loading("Converting...");
                            const res = await convertLeadToClientAction(leadId);
                            toast.dismiss(loadingId);

                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            toast.success(res.message);
                            setClientId(res.data?.clientId ?? null);
                          });
                        }}
                      >
                        Convert to Client
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Contact */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Contact</div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      <span className="font-medium text-foreground">Phone:</span> {phone}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Email:</span> {email || "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Location:</span>{" "}
                      {city ? city : "—"}
                      {state ? `, ${state}` : ""}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Status */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Status</div>
                  {leadId ? (
                    <UpdateLeadStatusForm
                      leadId={leadId}
                      status={(thread?.lead?.status ?? lead?.status) as any}
                    />
                  ) : null}
                </div>

                <Separator />

                {/* Request */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Request</div>
                  <div className="text-sm">
                    <span className="font-medium">Service:</span>{" "}
                    <span className="text-muted-foreground">{service || "—"}</span>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{message}</div>
                  {sourceUrl ? (
                    <a
                      className="text-xs underline text-muted-foreground"
                      href={sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source URL
                    </a>
                  ) : null}
                </div>

                <Separator />

                {/* Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Tasks</div>
                    <Badge variant="secondary">{openTaskCount} open</Badge>
                  </div>

                  <form
                    className="space-y-3 rounded-lg border p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!leadId) return;

                      const fd = new FormData();
                      fd.set("title", taskTitle);
                      fd.set("body", taskBody);
                      fd.set("dueAt", taskDueAt);
                      fd.set("priority", taskPriority);
                      fd.set("recurrence", taskRecurrence);
                      fd.set("leadId", leadId);

                      startTransition(async () => {
                        const loadingId = toast.loading("Creating task...");
                        const res: TaskActionResult = await createTaskAction(fd);
                        toast.dismiss(loadingId);

                        if (!res.ok) {
                          toast.error(res.error);
                          return;
                        }

                        toast.success(res.message);
                        setTaskTitle("");
                        setTaskBody("");
                        setTaskPriority("MEDIUM");
                        setTaskRecurrence("NONE");
                        setTaskDueAt(toDatetimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));

                        try {
                          await fetchLeadTasks(leadId);
                        } catch {}
                      });
                    }}
                  >
                    <div className="grid gap-2">
                      <div className="text-xs text-muted-foreground">Add follow-up</div>
                      <Input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="e.g., Call customer, send estimate, schedule visit"
                        disabled={isPending}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Textarea
                        value={taskBody}
                        onChange={(e) => setTaskBody(e.target.value)}
                        placeholder="Optional details..."
                        className="min-h-[80px]"
                        disabled={isPending}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">Due</div>
                        <Input
                          type="datetime-local"
                          value={taskDueAt}
                          onChange={(e) => setTaskDueAt(e.target.value)}
                          disabled={isPending}
                        />
                      </div>

                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">Priority</div>
                        <select
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value as any)}
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          disabled={isPending}
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">Repeat</div>
                        <select
                          value={taskRecurrence}
                          onChange={(e) => setTaskRecurrence(e.target.value as any)}
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          disabled={isPending}
                        >
                          <option value="NONE">None</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="BIWEEKLY">Biweekly</option>
                          <option value="MONTHLY">Monthly</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isPending || !leadId}>
                        {isPending ? "Saving..." : "Add Task"}
                      </Button>
                    </div>
                  </form>

                  <TaskListClient tasks={leadTasks.filter((t) => !t.completedAtIso)} />
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">Notes</div>

                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!leadId) return;

                      const fd = new FormData();
                      fd.set("leadId", leadId);
                      fd.set("body", noteBody);

                      startTransition(async () => {
                        const loadingId = toast.loading("Saving note...");
                        const res = await addLeadNoteAction(fd);
                        toast.dismiss(loadingId);

                        if (!res.ok) {
                          toast.error(res.error);
                          return;
                        }

                        toast.success(res.message);
                        setNoteBody("");

                        try {
                          const fresh = await getLeadThreadAction(leadId);
                          setThread(fresh);
                        } catch {}
                      });
                    }}
                  >
                    <Textarea
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder="Add a note (call log, follow-up date, estimate details...)"
                      className="min-h-[90px]"
                      disabled={isPending || !leadId}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isPending || !leadId}>
                        {isPending ? "Saving..." : "Add Note"}
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {!thread ? (
                      <div className="text-sm text-muted-foreground">Loading notes…</div>
                    ) : thread.notes.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No notes yet.</div>
                    ) : (
                      thread.notes.map((n) => (
                        <div key={n.id} className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">
                            {n.createdAt.replace("T", " ").slice(0, 16)} UTC
                          </div>
                          <div className="mt-1 text-sm whitespace-pre-wrap">{n.body}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <Separator className="shrink-0" />

          <div className="px-6 py-4 flex justify-end shrink-0">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
