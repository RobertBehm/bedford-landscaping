// src/app/(admin)/admin/tasks/page.tsx

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import TaskListClient, { type TaskRow } from "@/components/admin/TaskListClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SearchParams = {
  show?: string; // "open" | "done" | "all" (optional)
};

function utcDisplayFromDate(d: Date) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

function serialize(tasks: Array<{
  id: string;
  title: string;
  body: string | null;
  dueAt: Date;
  priority: "LOW" | "MEDIUM" | "HIGH";
  recurrence: "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  completedAt: Date | null;
  leadId: string | null;
  clientId: string | null;
}>): TaskRow[] {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    body: t.body,

    dueAtIso: t.dueAt.toISOString(),
    dueAtDisplay: utcDisplayFromDate(t.dueAt),

    priority: t.priority,
    recurrence: t.recurrence,

    completedAtIso: t.completedAt ? t.completedAt.toISOString() : null,

    leadId: t.leadId,
  }));
}

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgAdmin();

  const sp = await searchParams;
  const show = (sp.show ?? "open").toLowerCase();

  const where =
    show === "done"
      ? { completedAt: { not: null } }
      : show === "all"
        ? {}
        : { completedAt: null };

  const tasks = await prisma.task.findMany({
    where,
    orderBy:
      show === "done"
        ? [{ completedAt: "desc" }]
        : [{ dueAt: "asc" }, { priority: "desc" }],
    take: show === "done" ? 100 : 200,
    select: {
      id: true,
      title: true,
      body: true,
      dueAt: true,
      priority: true,
      recurrence: true,
      completedAt: true,
      leadId: true,
      clientId: true,
    },
  });

  const rows = serialize(tasks);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Everything due, overdue, and completed follow-ups.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {show === "done" ? "Completed" : show === "all" ? "All" : "Open"}
          </CardTitle>
          <div className="text-xs text-muted-foreground">{rows.length} shown</div>
        </CardHeader>

        <CardContent>
          <TaskListClient tasks={rows} showReopen={show !== "open"} />
        </CardContent>
      </Card>
    </div>
  );
}
