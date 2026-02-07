import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function requireClientUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const link = await prisma.clientUser.findUnique({
    where: { clerkUserId: userId },
    include: { client: true },
  });

  if (!link) throw new Error("No client account linked to this user.");

  return { userId, clientId: link.clientId, role: link.role, client: link.client };
}