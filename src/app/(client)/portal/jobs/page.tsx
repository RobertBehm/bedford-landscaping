import { prisma } from "@/lib/db";
import { requireClientUser } from "@/lib/client-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function utcDisplay(d: Date) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

export default async function ClientJobsPage() {
  const { clientId, client } = await requireClientUser();

  const jobs = await prisma.job.findMany({
    where: { clientId },
    orderBy: [{ scheduledStart: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      invoice: { select: { id: true, number: true, paidAt: true, dueAt: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Jobs</h2>
        <p className="text-sm text-muted-foreground">{client.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No jobs yet.</div>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="rounded-lg border p-3">
                <div className="font-medium">{j.title}</div>

                <div className="mt-1 text-sm text-muted-foreground">
                  {j.scheduledStart ? `Scheduled: ${utcDisplay(j.scheduledStart)}` : "Not scheduled"}
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Status: {j.status}
                  {j.invoice ? ` • Invoice #${j.invoice.number} ${j.invoice.paidAt ? "(Paid)" : ""}` : " • No invoice yet"}
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  TODO: Add job detail page and “what was done” notes visible to client.
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}