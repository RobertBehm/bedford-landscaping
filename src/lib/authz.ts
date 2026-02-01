// lib/authz.ts
import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireSignedIn() {
  // Protect first (redirect/deny handled by Clerk + middleware)
  const session = await auth.protect();
  return session;
}

export async function requireOrgAdmin() {
  const session = await auth.protect({ role: "org:admin" });
  return session;
}

export async function getSignedInUserOrNull() {
  return (await currentUser()) ?? null;
}

/**
 * If you want manual control instead of protect(), use this:
 */
export async function getAuth() {
  return await auth();
}
