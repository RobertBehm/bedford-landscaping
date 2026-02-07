"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data: T }
  | { ok: false; error: string };

export async function setClientAutopayAction(
  clientId: string,
  enabled: boolean
): Promise<ActionResult<{ enabled: boolean }>> {
  try {
    await requireOrgAdmin();

    if (!clientId) return { ok: false, error: "Missing clientId." };

    const client = await prisma.client.update({
      where: { id: clientId },
      data: { autopayEnabled: !!enabled },
      select: { id: true, autopayEnabled: true },
    });

    return {
      ok: true,
      message: client.autopayEnabled ? "Autopay enabled." : "Autopay disabled.",
      data: { enabled: client.autopayEnabled },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to update autopay." };
  }
}