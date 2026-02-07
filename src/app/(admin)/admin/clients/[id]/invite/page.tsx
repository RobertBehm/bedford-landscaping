import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";

import ClientInviteForm from "@/components/admin/ClientInviteForm";

export default async function AdminClientInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrgAdmin();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });

  if (!client) return notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Invite client to portal</h2>
        <p className="text-sm text-muted-foreground">{client.name}</p>
      </div>

      <ClientInviteForm clientId={client.id} defaultEmail={client.email ?? ""} />
      <div className="text-xs text-muted-foreground">
        TODO: Add “send email” + resend/revoke invites later.
      </div>
    </div>
  );
}