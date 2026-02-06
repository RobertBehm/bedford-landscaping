import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBottlenecks, type BottleneckItem } from "@/lib/alerts/bottlenecks";

function sevClass(sev: BottleneckItem["severity"]) {
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

function typeLabel(t: BottleneckItem["type"]) {
  switch (t) {
    case "DONE_NOT_INVOICED":
      return "Cash leak";
    case "OVERDUE_INVOICE_NO_REMINDER":
      return "Collections";
    case "OVERDUE_TASK":
      return "Execution";
    default:
      return "Bottleneck";
  }
}

/**
 * Server component
 *
 * TODO: Add “Fix it” quick actions later:
 * - DONE_NOT_INVOICED -> Create invoice
 * - OVERDUE_INVOICE_NO_REMINDER -> Open “log reminder” modal
 * - OVERDUE_TASK -> Mark complete / reschedule
 */
export default async function BottlenecksCard() {
  const items = await getBottlenecks({ limit: 12 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Bottlenecks</CardTitle>
        <div className="text-xs text-muted-foreground">{items.length} shown</div>
      </CardHeader>

      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No bottlenecks detected 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((b, idx) => (
              <Link
                key={`${b.type}-${idx}-${b.createdAtIso}`}
                href={b.href}
                className="block rounded-lg border p-3 hover:bg-muted/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{typeLabel(b.type)}</div>
                    <div className="font-medium truncate">{b.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{b.subtitle}</div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[11px] rounded-md border px-2 py-0.5 ${sevClass(b.severity)}`}>
                      {b.badge}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  {b.createdAtIso.slice(0, 10)} • TODO: add automation & quick-fix actions later
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
