"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; error: string };

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}

/**
 * Convert a lead into a client.
 * - Creates Client from Lead fields
 * - Links Lead.clientId
 * - Moves existing tasks over by setting Task.clientId where leadId matches
 * - Optionally creates a primary address if lead has enough fields
 */
export async function convertLeadToClientAction(leadId: string): Promise<ActionResult<{ clientId: string }>> {
  try {
    await requireOrgAdmin();

    const id = String(leadId || "").trim();
    if (!id) return { ok: false, error: "Missing leadId." };

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return { ok: false, error: "Lead not found." };

    // If already converted, just return the existing clientId
    if (lead.clientId) {
      return { ok: true, message: "Already converted.", data: { clientId: lead.clientId } };
    }

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          tags: lead.service ? `from-lead:${lead.service}` : null,
          notes: null,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { clientId: client.id },
      });

      // Move tasks (so recurring lawn follow-ups can live on the client)
      await tx.task.updateMany({
        where: { leadId: lead.id },
        data: { clientId: client.id },
      });

      // Create a primary address if lead has address-ish fields
      const hasAddr =
        Boolean(lead.address) || Boolean(lead.city) || Boolean(lead.state) || Boolean(lead.zip);

      if (hasAddr) {
        await tx.clientAddress.create({
          data: {
            clientId: client.id,
            label: "Primary",
            address: lead.address ?? "",
            city: lead.city,
            state: lead.state,
            zip: lead.zip,
            isPrimary: true,
          },
        });
      }

      return client;
    });

    revalidatePath("/admin/leads");
    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${result.id}`);

    return { ok: true, message: "Converted to client.", data: { clientId: result.id } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateClientAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const clientId = String(formData.get("clientId") || "").trim();
    if (!clientId) return { ok: false, error: "Missing clientId." };

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const tags = String(formData.get("tags") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    if (!name) return { ok: false, error: "Client name is required." };

    await prisma.client.update({
      where: { id: clientId },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        tags: tags || null,
        notes: notes || null,
      },
    });

    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${clientId}`);

    return { ok: true, message: "Client updated." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function addClientAddressAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const clientId = String(formData.get("clientId") || "").trim();
    if (!clientId) return { ok: false, error: "Missing clientId." };

    const label = String(formData.get("label") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const state = String(formData.get("state") || "").trim();
    const zip = String(formData.get("zip") || "").trim();
    const gateCode = String(formData.get("gateCode") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const isPrimary = String(formData.get("isPrimary") || "false") === "true";

    if (!address) return { ok: false, error: "Address is required." };

    await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.clientAddress.updateMany({
          where: { clientId },
          data: { isPrimary: false },
        });
      }

      await tx.clientAddress.create({
        data: {
          clientId,
          label: label || null,
          address,
          city: city || null,
          state: state || null,
          zip: zip || null,
          gateCode: gateCode || null,
          notes: notes || null,
          isPrimary,
        },
      });
    });

    revalidatePath(`/admin/clients/${clientId}`);
    return { ok: true, message: "Address added." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteClientAddressAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const clientId = String(formData.get("clientId") || "").trim();
    const addressId = String(formData.get("addressId") || "").trim();
    if (!clientId || !addressId) return { ok: false, error: "Missing ids." };

    await prisma.clientAddress.delete({ where: { id: addressId } });

    revalidatePath(`/admin/clients/${clientId}`);
    return { ok: true, message: "Address deleted." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
