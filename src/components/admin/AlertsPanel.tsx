import Link from "next/link";
import { getAlerts } from "@/lib/alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function badgeVariant(sev: "info" | "warning" | "critical") {
  if (sev === "critical") return "destructive";
  if (sev === "warning") return "secondary";
  return "outline";
}

export default async function AlertsPanel() {
  const alerts = await getAlerts(new Date());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Alerts</CardTitle>
        <div className="text-xs text-muted-foreground">
          {alerts.length} active
          {/* TODO: Add “Snooze” and “Assign to user” */}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-sm text-muted-foreground">No alerts. You’re on top of everything.</div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className="block rounded-lg border p-3 hover:bg-muted/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{a.title}</div>
                      <Badge variant={badgeVariant(a.severity)}>{a.severity.toUpperCase()}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{a.detail}</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {a.ageDays}d
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          TODO: Turn these into SLA-based rules + notifications (cron).
        </div>
      </CardContent>
    </Card>
  );
}
