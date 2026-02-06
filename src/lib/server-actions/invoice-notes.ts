"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; error: string };

const CHANNELS = ["CALL", "TEXT", "EMAIL", "IN_PERSON", "OTHER"] as const;
type Channel = (typeof CHANNELS)[number];

function normalizeChannel(raw: string): Channel | null {
  const s = raw.trim().toUpperCase();
  return (CHANNELS as readonly string[]).includes(s) ? (s as Channel) : null;
}

/**
 * Create an invoice reminder/contact note.
 *
 * TODO: Add Clerk user id as createdByUserId when we wire user identity into server env safely.
 * TODO: Add automation later (cron) to create notes when emails/texts are sent automatically.
 */
export async function createInvoiceNoteAction(fd: FormData): Promise<ActionResult<{ noteId: string }>> {
  try {
    await requireOrgAdmin();

    const invoiceId = String(fd.get("invoiceId") ?? "").trim();
    const channelRaw = String(fd.get("channel") ?? "").trim();
    const body = String(fd.get("body") ?? "").trim();

    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };

    const channel = normalizeChannel(channelRaw);
    if (!channel) return { ok: false, error: "Invalid channel." };

    if (!body) return { ok: false, error: "Note body is required." };
    if (body.length > 2000) return { ok: false, error: "Note is too long (max 2000 chars)." };

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true },
    });

    if (!invoice) return { ok: false, error: "Invoice not found." };

    const note = await prisma.invoiceNote.create({
      data: {
        invoiceId: invoice.id,
        channel: channel as any,
        body,
        // createdByUserId: TODO
      },
      select: { id: true },
    });

    return { ok: true, message: "Reminder note saved.", data: { noteId: note.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to save note." };
  }
}
