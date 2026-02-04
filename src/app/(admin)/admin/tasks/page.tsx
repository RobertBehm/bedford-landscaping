import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import TaskListClient from "@/components/admin/TaskListClient";
import type { TaskRow } from "@/components/admin/TaskListClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function serialize(tasks: any[]): TaskRow[] {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    body: t.body,
    dueAt: t.dueAt.toISOString(),
    priority: t.priority,
    recurrence: t.recurrence,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    leadId: t.leadId,
  }));
}

export default async function AdminTasksPage() {
  await requireOrgAdmin();

  const [openTasks, doneTasks] = await Promise.all([
    prisma.task.findMany({
      where: { completedAt: null },
      orderBy: [{ dueAt: "asc" }],
      take: 200,
    }),
    prisma.task.findMany({
      where: { completedAt: { not: null } },
      orderBy: [{ completedAt: "desc" }],
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Open tasks first, then recent completed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskListClient tasks={serialize(openTasks)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completed (recent)</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskListClient tasks={serialize(doneTasks)} showReopen />
        </CardContent>
      </Card>
    </div>
  );
}
