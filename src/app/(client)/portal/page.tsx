import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireClientUser } from "@/lib/client-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function utcDisplay(d: Date) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

export default async function ClientPortalHome() {
  const { clientId, client } = await requireClientUser();

  const upcoming = await prisma.job.findMany({
    where: {
      clientId,
      scheduledStart: { not: null, gte: new Date() },
    },
    orderBy: { scheduledStart: "asc" },
    take: 10,
    include: { invoice: { select: { id: true, number: true, paidAt: true, dueAt: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Your Portal</h2>
          <p className="text-sm text-muted-foreground">{client.name}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/portal/invoices">Invoices</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/portal/jobs">Jobs</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground">No upcoming jobs scheduled.</div>
          ) : (
            upcoming.map((j) => (
              <div key={j.id} className="rounded-lg border p-3">
                <div className="font-medium">{j.title}</div>
                <div className="text-sm text-muted-foreground">
                  {j.scheduledStart ? utcDisplay(j.scheduledStart) : "Not scheduled"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  TODO: show crew ETA + service plan info.
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        TODO: Add “Request service” form + messaging.
      </div>
    </div>
  );
}