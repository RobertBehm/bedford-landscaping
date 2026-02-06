import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";

import JobEditorClient from "@/components/admin/JobEditorClient";

type SearchParams = {
  clientId?: string;
};

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

export default async function AdminJobNewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
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
        <h2 className="text-2xl font-semibold tracking-tight">New Job</h2>
        <p className="text-sm text-muted-foreground">
          Create a work order for <span className="font-medium text-foreground">{client.name}</span>.
        </p>
      </div>

      <JobEditorClient
        mode="create"
        job={null}
        client={{ id: client.id, name: client.name }}
        addresses={client.addresses.map(addrToOption)}
      />
    </div>
  );
}
