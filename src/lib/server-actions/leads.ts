"use server";

import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";

export async function updateLeadStatusAction(formData: FormData) {
  await requireOrgAdmin();

  const leadId = String(formData.get("leadId") || "");
  const status = String(formData.get("status") || "") as LeadStatus;

  if (!leadId) throw new Error("Missing leadId");

  const allowed: LeadStatus[] = ["NEW", "CONTACTED", "SCHEDULED", "COMPLETED", "ARCHIVED"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  await prisma.lead.update({
    where: { id: leadId },
    data: { status },
  });
}
