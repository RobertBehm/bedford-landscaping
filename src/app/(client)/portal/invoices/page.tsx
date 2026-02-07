import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireClientUser } from "@/lib/client-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PayInvoiceSavedCardButton from "@/components/portal/PayInvoiceSavedCardButton";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function usd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (cents ?? 0) / 100
  );
}

function utcDisplay(d: Date) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

export default async function ClientInvoicesPage() {
  const { clientId, client } = await requireClientUser();

  const [invoices, defaultPm] = await Promise.all([
    prisma.invoice.findMany({
      where: { job: { clientId } },
      orderBy: [{ issuedAt: "desc" }],
      take: 100,
      include: { job: { select: { id: true, title: true } } },
    }),
    prisma.clientPaymentMethod.findFirst({
      where: { clientId, isDefault: true },
      select: { id: true },
    }),
  ]);

  const hasSavedCard = !!defaultPm;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Invoices</h2>
        <p className="text-sm text-muted-foreground">{client.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No invoices yet.</div>
          ) : (
            invoices.map((inv) => {
              const isPaid = !!inv.paidAt;

              return (
                <div key={inv.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">Invoice #{inv.number}</div>
                    <div className="text-sm font-medium">{usd(inv.totalCents)}</div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Issued: {utcDisplay(inv.issuedAt)}
                    {inv.dueAt ? ` • Due: ${utcDisplay(inv.dueAt)}` : ""}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {isPaid ? `Paid: ${utcDisplay(inv.paidAt!)}` : "Unpaid"}
                    {inv.amountPaidCents ? ` • Paid so far: ${usd(inv.amountPaidCents)}` : ""}
                  </div>

                  <div className="text-xs text-muted-foreground">Job: {inv.job.title}</div>

                  {!isPaid ? (
                    <div className="flex flex-wrap gap-2 pt-1 items-center">
                      {/* Saved-card quick pay (if available) */}
                      {hasSavedCard ? <PayInvoiceSavedCardButton invoiceId={inv.id} /> : null}

                      {/* Always provide a fallback one-time card pay */}
                      <Button asChild variant="secondary">
                        <Link href={`/portal/invoices/${inv.id}/pay`}>Pay with card</Link>
                      </Button>

                      <div className="text-xs text-muted-foreground">
                        TODO: Add “save card” option on pay page later.
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        TODO: Add PDF download + receipt emails + partial payments later.
      </div>
    </div>
  );
}