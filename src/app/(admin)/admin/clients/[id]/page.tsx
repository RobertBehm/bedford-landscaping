import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import TaskListClient from "@/components/admin/TaskListClient";
import type { TaskRow } from "@/components/admin/TaskListClient";
import ClientEditorClient from "@/components/admin/ClientEditorClient";
import Link from "next/link";

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

  const jobs = await prisma.job.findMany({
    where: { clientId: client.id },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      address: { select: { address: true, city: true, state: true, zip: true } },
    },
  });

  const plans = await prisma.servicePlan.findMany({
  where: { clientId: client.id },
  orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  take: 50,
});


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{client.name}</h2>
          <p className="text-sm text-muted-foreground">
            Created {utcDisplayFromDate(client.createdAt)} • Updated {utcDisplayFromDate(client.updatedAt)}
          </p>
        </div>

        <Button asChild>
          <Link href={`/admin/jobs/new?clientId=${client.id}`}>Create Job</Link>
        </Button>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Jobs</CardTitle>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/admin/jobs?range=all&q=${encodeURIComponent(client.name)}`}>View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No jobs yet.</div>
          ) : (
            jobs.map((j) => {
              const addr = j.address
                ? [j.address.address, j.address.city, j.address.state, j.address.zip]
                    .filter(Boolean)
                    .join(", ")
                : null;

              return (
                <Link
                  key={j.id}
                  href={`/admin/jobs/${j.id}`}
                  className="block rounded-lg border p-4 transition hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{j.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {j.scheduledStart ? utcDisplayFromDate(j.scheduledStart) : "Not scheduled"}
                        </div>
                      </div>

                      <div className="mt-1 text-sm text-muted-foreground">
                        {addr ? addr : "No address"}
                      </div>

                      {(j.estimatedPriceCents != null || j.actualPriceCents != null) && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {j.estimatedPriceCents != null ? `Est: $${(j.estimatedPriceCents / 100).toFixed(2)}` : ""}
                          {j.estimatedPriceCents != null && j.actualPriceCents != null ? " • " : ""}
                          {j.actualPriceCents != null ? `Actual: $${(j.actualPriceCents / 100).toFixed(2)}` : ""}
                        </div>
                      )}
                    </div>

                    <div className="text-xs rounded-md border px-2 py-1 inline-flex self-start">
                      {j.status}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

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

      <Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle className="text-base">Service Plans</CardTitle>
    <Button asChild size="sm">
      <Link href={`/admin/plans/new?clientId=${client.id}`}>Create Plan</Link>
    </Button>
  </CardHeader>

  <CardContent className="space-y-3">
    {plans.length === 0 ? (
      <div className="text-sm text-muted-foreground">No service plans yet.</div>
    ) : (
      plans.map((p) => (
        <Link
          key={p.id}
          href={`/admin/plans/${p.id}`}
          className="block rounded-lg border p-4 transition hover:bg-muted/40"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs rounded-md border px-2 py-0.5 inline-flex">{p.frequency}</div>
                <div className="text-xs rounded-md border px-2 py-0.5 inline-flex">{p.status}</div>
              </div>

              <div className="mt-1 text-sm text-muted-foreground">
                Start {p.startDate.toISOString().slice(0, 10)}
                {p.pricePerVisitCents != null ? ` • $${(p.pricePerVisitCents / 100).toFixed(2)}/visit` : ""}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Updated {p.updatedAt.toISOString().slice(0, 10)}
            </div>
          </div>
        </Link>
      ))
    )}
  </CardContent>
</Card>

    </div>
  );
}
