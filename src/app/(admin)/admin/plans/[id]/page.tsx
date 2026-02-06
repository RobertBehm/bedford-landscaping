import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";

import ServicePlanEditorClient from "@/components/admin/ServicePlanEditorClient";

function toDateInput(d: Date) {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

export default async function AdminPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrgAdmin();
  const { id } = await params;

  const plan = await prisma.servicePlan.findUnique({
    where: { id },
    include: {
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

  if (!plan) return notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{plan.title}</h2>
        <p className="text-sm text-muted-foreground">
          Client: <span className="font-medium text-foreground">{plan.client.name}</span>
        </p>
      </div>

      <ServicePlanEditorClient
        mode="edit"
        plan={{
          id: plan.id,
          clientId: plan.clientId,
          title: plan.title,
          notes: plan.notes,
          status: plan.status as any,
          frequency: plan.frequency as any,
          startDate: toDateInput(plan.startDate),
          endDate: plan.endDate ? toDateInput(plan.endDate) : "",
          dayOfWeek: plan.dayOfWeek,
          dayOfMonth: plan.dayOfMonth,
          pricePerVisitCents: plan.pricePerVisitCents,
          addressId: plan.addressId,
        }}
        client={{ id: plan.client.id, name: plan.client.name }}
        addresses={plan.client.addresses}
      />
    </div>
  );
}
