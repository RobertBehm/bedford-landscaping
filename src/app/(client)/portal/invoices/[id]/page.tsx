// src/app/(portal)/portal/invoices/[id]/pay/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireClientUser } from "@/lib/client-auth";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PayInvoiceForm from "@/components/portal/PayInvoiceForm";

export const dynamic = "force-dynamic";

function usd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (cents ?? 0) / 100
  );
}

export default async function PortalPayInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { clientId } = await requireClientUser();
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { job: { select: { clientId: true, title: true } } },
  });

  if (!invoice) return notFound();
  if (invoice.job.clientId !== clientId) return notFound();

  const amountDue = Math.max(0, invoice.totalCents - (invoice.amountPaidCents ?? 0));
  const isPaid = !!invoice.paidAt || amountDue <= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pay Invoice #{invoice.number}</h2>
          <p className="text-sm text-muted-foreground">{invoice.job.title}</p>
        </div>

        <Button asChild variant="secondary">
          <Link href="/portal/invoices">Back to invoices</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isPaid ? "Invoice is already paid" : `Amount Due: ${usd(amountDue)}`}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {isPaid ? (
            <div className="text-sm text-muted-foreground">
              Nothing to pay here.
              <div className="mt-2 text-xs text-muted-foreground">
                TODO: Show receipt / payment history here later.
              </div>
            </div>
          ) : (
            <>
              <PayInvoiceForm invoiceId={invoice.id} />
              <div className="text-xs text-muted-foreground">
                TODO: Offer “save card after payment” checkbox later.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}