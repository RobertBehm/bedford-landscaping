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

function parseCents(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function parseOptionalDate(raw: FormDataEntryValue | null): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createJobAction(formData: FormData): Promise<ActionResult<{ jobId: string }>> {
  try {
    await requireOrgAdmin();

    const clientId = String(formData.get("clientId") || "").trim();
    const addressId = String(formData.get("addressId") || "").trim();
    const leadId = String(formData.get("leadId") || "").trim();

    const title = String(formData.get("title") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    const scheduledStart = parseOptionalDate(formData.get("scheduledStart"));
    const scheduledEnd = parseOptionalDate(formData.get("scheduledEnd"));

    const estimatedPriceCents = parseCents(formData.get("estimatedPrice"));

    if (!clientId) return { ok: false, error: "Missing clientId." };
    if (!title) return { ok: false, error: "Job title is required." };

    const job = await prisma.job.create({
      data: {
        clientId,
        addressId: addressId || null,
        leadId: leadId || null,
        title,
        notes: notes || null,
        status: scheduledStart ? "SCHEDULED" : "DRAFT",
        scheduledStart,
        scheduledEnd,
        estimatedPriceCents,
      },
      select: { id: true },
    });

    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/clients/${clientId}`);

    return { ok: true, message: "Job created.", data: { jobId: job.id } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateJobAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const jobId = String(formData.get("jobId") || "").trim();
    if (!jobId) return { ok: false, error: "Missing jobId." };

    const title = String(formData.get("title") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const status = String(formData.get("status") || "").trim() as any;

    const addressId = String(formData.get("addressId") || "").trim();
    const scheduledStart = parseOptionalDate(formData.get("scheduledStart"));
    const scheduledEnd = parseOptionalDate(formData.get("scheduledEnd"));

    const estimatedPriceCents = parseCents(formData.get("estimatedPrice"));
    const actualPriceCents = parseCents(formData.get("actualPrice"));

    if (!title) return { ok: false, error: "Job title is required." };

    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        notes: notes || null,
        status,
        addressId: addressId || null,
        scheduledStart,
        scheduledEnd,
        estimatedPriceCents,
        actualPriceCents,
      },
      select: { id: true, clientId: true },
    });

    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/jobs/${job.id}`);
    revalidatePath(`/admin/clients/${job.clientId}`);

    return { ok: true, message: "Job updated." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
