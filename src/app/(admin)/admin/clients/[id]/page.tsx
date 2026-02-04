import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import TaskListClient from "@/components/admin/TaskListClient";
import type { TaskRow } from "@/components/admin/TaskListClient";
import ClientEditorClient from "@/components/admin/ClientEditorClient";

function utcDisplayFromDate(d: Date) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

function serializeTasks(tasks: any[]): TaskRow[] {
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

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrgAdmin();

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] },
    },
  });

  if (!client) return notFound();

  const openTasks = await prisma.task.findMany({
    where: { clientId: client.id, completedAt: null },
    orderBy: [{ dueAt: "asc" }],
    take: 200,
  });

  const completedTasks = await prisma.task.findMany({
    where: { clientId: client.id, completedAt: { not: null } },
    orderBy: [{ completedAt: "desc" }],
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{client.name}</h2>
        <p className="text-sm text-muted-foreground">
          Created {utcDisplayFromDate(client.createdAt)} • Updated {utcDisplayFromDate(client.updatedAt)}
        </p>
      </div>

      <ClientEditorClient
        client={{
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          tags: client.tags,
          notes: client.notes,
          addresses: client.addresses.map((a) => ({
            id: a.id,
            label: a.label,
            address: a.address,
            city: a.city,
            state: a.state,
            zip: a.zip,
            gateCode: a.gateCode,
            notes: a.notes,
            isPrimary: a.isPrimary,
            createdAtDisplay: utcDisplayFromDate(a.createdAt),
          })),
        }}
      />

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskListClient tasks={serializeTasks(openTasks)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completed Tasks (recent)</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskListClient tasks={serializeTasks(completedTasks)} showReopen />
        </CardContent>
      </Card>
    </div>
  );
}
