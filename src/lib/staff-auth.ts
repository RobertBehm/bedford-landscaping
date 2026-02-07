import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export type StaffGate =
  | { ok: true; staffUserId: string; role: "ADMIN" | "STAFF" }
  | { ok: false };

export async function getStaffGate(): Promise<StaffGate> {
  const a = await auth();
  const userId = a.userId;
  if (!userId) return { ok: false };

  const staff = await prisma.staffUser.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true },
  });

  if (!staff) return { ok: false };
  return { ok: true, staffUserId: staff.id, role: staff.role as any };
}

/**
 * Staff can access “limited admin” areas.
 * TODO: Define page-level permission map later (jobs read, invoices read, etc.)
 */
export async function requireStaff(): Promise<{ staffUserId: string; role: "ADMIN" | "STAFF" }> {
  const gate = await getStaffGate();
  if (!gate.ok) redirect("/sign-in");
  return { staffUserId: gate.staffUserId, role: gate.role };
}

/**
 * Admin employees.
 * TODO: Expand to support org roles or per-permission checks later.
 */
export async function requireStaffAdmin(): Promise<{ staffUserId: string }> {
  const gate = await getStaffGate();
  if (!gate.ok) redirect("/sign-in");
  if (gate.role !== "ADMIN") redirect("/admin"); // or /unauthorized
  return { staffUserId: gate.staffUserId };
}