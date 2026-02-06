import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";

import JobEditorClient from "@/components/admin/JobEditorClient";
import InvoiceActionsClient from "@/components/invoices/InvoiceActionsClient";
import InvoiceNotesClient, { type InvoiceNoteRow } from "@/components/invoices/InvoiceNotesClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function toDatetimeLocalValueFromIso(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function addrToOption(a: any) {
  return {
    id: a.id,
    label: a.label,
    address: a.address,
    city: a.city,
    state: a.state,
    zip: a.zip,
    isPrimary: a.isPrimary,
  };
}

function money(cents: number | null | undefined) {
  const v = cents ?? 0;
  return `$${(v / 100).toFixed(2)}`;
}

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrgAdmin();

  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      invoice: {
        include: {
          notes: { orderBy: { createdAt: "desc" } },
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          addresses: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
            select: {
              id: true,
              label: true,
              address: true,
              city: true,
              state: true,
              zip: true,
              isPrimary: true,
            },
          },
        },
      },
    },
  });

  if (!job) return notFound();

  const invoice = job.invoice
    ? {
        id: job.invoice.id,
        number: job.invoice.number,
        totalCents: job.invoice.totalCents,
        amountPaidCents: job.invoice.amountPaidCents,
        dueAtIso: job.invoice.dueAt ? job.invoice.dueAt.toISOString() : null,
        paidAtIso: job.invoice.paidAt ? job.invoice.paidAt.toISOString() : null,
        paymentMethod: (job.invoice.paymentMethod as any) ?? null,
      }
    : null;

  const invoiceNotes: InvoiceNoteRow[] =
    job.invoice?.notes?.map((n) => ({
      id: n.id,
      createdAtIso: n.createdAt.toISOString(),
      channel: n.channel as any,
      body: n.body,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{job.title}</h2>
        <p className="text-sm text-muted-foreground">
          Client: <span className="font-medium text-foreground">{job.client.name}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice & Collections</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {invoice ? (
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Invoice #</span> {invoice.number}
              </div>
              <div>
                <span className="text-muted-foreground">Total</span> {money(invoice.totalCents)}
              </div>
              <div>
                <span className="text-muted-foreground">Due</span>{" "}
                {invoice.dueAtIso ? invoice.dueAtIso.slice(0, 10) : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Paid</span>{" "}
                {invoice.paidAtIso ? invoice.paidAtIso.slice(0, 10) : "No"}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No invoice yet.</div>
          )}

          <InvoiceActionsClient jobId={job.id} invoice={invoice} />

          {invoice ? (
            <InvoiceNotesClient invoiceId={invoice.id} notes={invoiceNotes} />
          ) : (
            <div className="text-xs text-muted-foreground">
              Create an invoice to start logging reminders.
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            TODO: Auto-reminder rules + cron worker + email/SMS integration later.
          </div>
        </CardContent>
      </Card>

      <JobEditorClient
        mode="edit"
        job={{
          id: job.id,
          clientId: job.clientId,
          leadId: job.leadId,
          title: job.title,
          notes: job.notes,
          status: job.status as any,
          scheduledStartIso: job.scheduledStart
            ? toDatetimeLocalValueFromIso(job.scheduledStart.toISOString())
            : "",
          scheduledEndIso: job.scheduledEnd
            ? toDatetimeLocalValueFromIso(job.scheduledEnd.toISOString())
            : "",
          estimatedPriceCents: job.estimatedPriceCents,
          actualPriceCents: job.actualPriceCents,
          addressId: job.addressId,
        }}
        client={{ id: job.client.id, name: job.client.name }}
        addresses={job.client.addresses.map(addrToOption)}
      />
    </div>
  );
}
