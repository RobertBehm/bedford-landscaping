"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type LeadThread = {
  lead: {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    email: string | null;
    phone: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    service: string | null;
    message: string;
    status: string; // LeadStatus as string
    sourceUrl: string | null;
    customerUserId: string | null;
  };
  notes: {
    id: string;
    body: string;
    createdAt: string;
    authorId: string | null;
  }[];
};

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}

export async function getLeadThreadAction(leadId: string): Promise<LeadThread> {
  await requireOrgAdmin();

  if (!leadId) throw new Error("Missing leadId.");

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) throw new Error("Lead not found.");

  const notes = await prisma.leadNote.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    lead: {
      id: lead.id,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      service: lead.service,
      message: lead.message,
      status: String(lead.status),
      sourceUrl: lead.sourceUrl,
      customerUserId: lead.customerUserId,
    },
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
      authorId: n.authorId,
    })),
  };
}

export async function addLeadNoteAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const leadId = String(formData.get("leadId") || "");
    const body = String(formData.get("body") || "").trim();

    if (!leadId) return { ok: false, error: "Missing leadId." };
    if (!body) return { ok: false, error: "Note cannot be empty." };
    if (body.length > 5000) return { ok: false, error: "Note is too long (max 5000 chars)." };

    const a = await auth();
    const authorId = a.userId ?? null;

    await prisma.leadNote.create({
      data: {
        leadId,
        body,
        authorId,
      },
    });

    // Revalidate the leads page so server-rendered content stays fresh.
    revalidatePath("/admin/leads");

    return { ok: true, message: "Note added." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
