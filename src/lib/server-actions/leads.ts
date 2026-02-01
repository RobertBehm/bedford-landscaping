"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { LeadStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { leadCreateSchema } from "@/lib/validation";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export async function updateLeadStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const leadId = String(formData.get("leadId") || "");
    const status = String(formData.get("status") || "") as LeadStatus;

    if (!leadId) return { ok: false, error: "Missing leadId." };

    const allowed: LeadStatus[] = ["NEW", "CONTACTED", "SCHEDULED", "COMPLETED", "ARCHIVED"];
    if (!allowed.includes(status)) return { ok: false, error: "Invalid status." };

    await prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });

    revalidatePath("/admin/leads");
    return { ok: true, message: "Lead updated." };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err) };
  }
}

export async function createLeadAction(formData: FormData): Promise<ActionResult> {
  try {
    const raw = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      address: String(formData.get("address") || ""),
      city: String(formData.get("city") || ""),
      state: String(formData.get("state") || ""),
      zip: String(formData.get("zip") || ""),
      service: String(formData.get("service") || ""),
      message: String(formData.get("message") || ""),
      sourceUrl: String(formData.get("sourceUrl") || ""),
    };

    const parsed = leadCreateSchema.safeParse(raw);
    if (!parsed.success) {
      const first =
        parsed.error.issues?.[0]?.message ??
        "Please check the form fields and try again.";
      return { ok: false, error: first };
    }

    await prisma.lead.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email?.trim() ? parsed.data.email.trim() : null,
        phone: parsed.data.phone.trim(),
        address: parsed.data.address?.trim() ? parsed.data.address.trim() : null,
        city: parsed.data.city?.trim() ? parsed.data.city.trim() : null,
        state: parsed.data.state?.trim() ? parsed.data.state.trim() : null,
        zip: parsed.data.zip?.trim() ? parsed.data.zip.trim() : null,
        service: parsed.data.service?.trim() ? parsed.data.service.trim() : null,
        message: parsed.data.message.trim(),
        sourceUrl: parsed.data.sourceUrl?.trim() ? parsed.data.sourceUrl.trim() : null,
      },
    });

    revalidatePath("/admin/leads");
    return { ok: true, message: "Request submitted. We’ll reach out shortly." };
  } catch (err) {
    // Optional: prettier Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return { ok: false, error: "Database error. Please try again." };
    }
    return { ok: false, error: getErrorMessage(err) };
  }
}
