import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvoiceAlerts } from "@/lib/alerts/invoice-alerts";

function money(cents: number | null | undefined) {
  const v = cents ?? 0;
  return `$${(v / 100).toFixed(2)}`;
}

function sevClass(sev: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") {
  switch (sev) {
    case "CRITICAL":
      return "border-destructive text-destructive";
    case "HIGH":
      return "border-destructive/60 text-destructive";
    case "MEDIUM":
      return "border-yellow-500/60 text-yellow-600";
    default:
      return "border-muted-foreground/30 text-muted-foreground";
  }
}

/**
 * Server Component: safe to render on dashboard.
 *
 * TODO: Later, add “Send reminder” shortcut button that also logs a note.
 */
export default async function InvoiceAlertsCard() {
  const alerts = await getInvoiceAlerts({ limit: 12 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Invoice Alerts</CardTitle>
        <div className="text-xs text-muted-foreground">{alerts.length} shown</div>
      </CardHeader>

      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-sm text-muted-foreground">No overdue invoices 🎉</div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <Link
                key={a.invoiceId}
                href={`/admin/jobs/${a.jobId}`}
                className="block rounded-lg border p-3 hover:bg-muted/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      #{a.invoiceNumber} • {a.clientName}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{a.jobTitle}</div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      Due {a.dueAtIso.slice(0, 10)} • {a.daysOverdue}d overdue
                      {a.lastReminderAtIso ? ` • Last reminder ${a.lastReminderAtIso.slice(0, 10)}` : " • No reminders yet"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold">{money(a.totalCents)}</div>
                    <div className="text-xs text-muted-foreground">Paid: {money(a.amountPaidCents)}</div>

                    <div className="mt-2">
                      <span className={`text-[11px] rounded-md border px-2 py-0.5 ${sevClass(a.severity)}`}>
                        {a.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  TODO: Add auto-reminder cron + “promise to pay” tracking later.
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="pt-2">
          <Link href="/admin/invoices" className="text-xs underline text-muted-foreground">
            View all invoices
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
