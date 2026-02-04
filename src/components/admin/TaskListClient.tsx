"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleTaskCompleteAction } from "@/lib/server-actions/tasks";

export type TaskRow = {
  id: string;
  title: string;
  body: string | null;

  dueAtIso: string;
  dueAtDisplay: string;

  priority: "LOW" | "MEDIUM" | "HIGH";
  recurrence: "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

  completedAtIso: string | null;
  leadId: string | null;
};

function priorityBadge(p: TaskRow["priority"]) {
  if (p === "HIGH") return <Badge>HIGH</Badge>;
  if (p === "LOW") return <Badge variant="secondary">LOW</Badge>;
  return <Badge variant="outline">MEDIUM</Badge>;
}

export default function TaskListClient({
  tasks,
  showReopen = false,
}: {
  tasks: TaskRow[];
  showReopen?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <div className="text-sm text-muted-foreground">No tasks.</div>
      ) : (
        tasks.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border p-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{t.title}</div>
                {priorityBadge(t.priority)}
                {t.recurrence !== "NONE" ? <Badge variant="secondary">{t.recurrence}</Badge> : null}
                {t.completedAtIso ? <Badge variant="outline">DONE</Badge> : null}
              </div>

              <div className="text-xs text-muted-foreground mt-1">Due: {t.dueAtDisplay}</div>

              {t.body ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                  {t.body}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2 sm:justify-end">
              {!t.completedAtIso ? (
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("taskId", t.id);
                    fd.set("complete", "true");

                    startTransition(async () => {
                      const loadingId = toast.loading("Completing...");
                      const res = await toggleTaskCompleteAction(fd);
                      toast.dismiss(loadingId);
                      if (res.ok) toast.success(res.message);
                      else toast.error(res.error);
                    });
                  }}
                >
                  Mark Done
                </Button>
              ) : showReopen ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("taskId", t.id);
                    fd.set("complete", "false");

                    startTransition(async () => {
                      const loadingId = toast.loading("Re-opening...");
                      const res = await toggleTaskCompleteAction(fd);
                      toast.dismiss(loadingId);
                      if (res.ok) toast.success(res.message);
                      else toast.error(res.error);
                    });
                  }}
                >
                  Re-open
                </Button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
