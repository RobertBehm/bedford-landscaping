import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";

import ServicePlanEditorClient from "@/components/admin/ServicePlanEditorClient";

type SearchParams = { clientId?: string };

export default async function AdminPlanNewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireOrgAdmin();
  const sp = await searchParams;

  const clientId = (sp.clientId ?? "").trim();
  if (!clientId) return notFound();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
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
  });

  if (!client) return notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">New Service Plan</h2>
        <p className="text-sm text-muted-foreground">
          Create a recurring plan for <span className="font-medium text-foreground">{client.name}</span>.
        </p>
      </div>

      <ServicePlanEditorClient
        mode="create"
        plan={null}
        client={{ id: client.id, name: client.name }}
        addresses={client.addresses}
      />
    </div>
  );
}
