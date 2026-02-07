"use server";

import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string };

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function expiresInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Create a client portal invite (invite-only portal onboarding).
 * Default expiry: 7 days.
 * TODO: Add email sending later.
 */
export async function createClientInviteAction(fd: FormData): Promise<ActionResult<{ inviteUrl: string }>> {
  try {
    await requireOrgAdmin();

    const clientId = String(fd.get("clientId") ?? "").trim();
    const email = normalizeEmail(String(fd.get("email") ?? ""));
    const role = String(fd.get("role") ?? "OWNER").trim(); // OWNER | MEMBER

    if (!clientId) return { ok: false, error: "Missing clientId." };
    if (!email || !email.includes("@")) return { ok: false, error: "Valid email is required." };

    const token = makeToken();

    const invite = await prisma.clientInvite.create({
      data: {
        clientId,
        email,
        token,
        expiresAt: expiresInDays(7),
        role: role as any,
        // TODO: store createdByUserId from Clerk when you expose it in authz
      },
      select: { token: true },
    });

    const inviteUrl = `/portal/accept-invite?token=${invite.token}`;
    return { ok: true, message: "Invite created.", data: { inviteUrl } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to create invite." };
  }
}

/**
 * Create an employee/staff invite (limited admin access).
 * Default expiry: 7 days.
 * TODO: Add email sending later.
 */
export async function createStaffInviteAction(fd: FormData): Promise<ActionResult<{ inviteUrl: string }>> {
  try {
    await requireOrgAdmin();

    const email = normalizeEmail(String(fd.get("email") ?? ""));
    const role = String(fd.get("role") ?? "STAFF").trim(); // STAFF | ADMIN

    if (!email || !email.includes("@")) return { ok: false, error: "Valid email is required." };

    const token = makeToken();

    const invite = await prisma.staffInvite.create({
      data: {
        email,
        token,
        expiresAt: expiresInDays(7),
        role: role as any,
      },
      select: { token: true },
    });

    const inviteUrl = `/staff/accept-invite?token=${invite.token}`;
    return { ok: true, message: "Staff invite created.", data: { inviteUrl } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to create staff invite." };
  }
}