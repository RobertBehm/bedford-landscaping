import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Client portal invite acceptance
 *
 * Invite-only flow:
 * - token in URL
 * - force sign-in/sign-up
 * - lock invite to email (recommended)
 * - create ClientUser row
 *
 * TODO: Support multiple clients per same clerkUserId later (requires schema changes).
 */
export default async function PortalAcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp.token ?? "").trim();
  if (!token) return redirect("/portal");

  const a = await auth();
  if (!a.userId) {
    // Send them to sign-in, then back here.
    redirect(`/sign-in?redirect_url=/portal/accept-invite?token=${encodeURIComponent(token)}`);
  }

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const primaryEmail = (user.emailAddresses?.[0]?.emailAddress ?? "").toLowerCase();

  const invite = await prisma.clientInvite.findUnique({
    where: { token },
    include: { client: { select: { id: true, name: true } } },
  });

  if (!invite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            This invite link is invalid.
          </div>
          <Button asChild variant="secondary">
            <Link href="/portal">Go to portal</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (invite.acceptedAt) {
    redirect("/portal");
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite expired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Ask the business to send a new invite link.
          </div>
          <Button asChild variant="secondary">
            <Link href="/portal">Go to portal</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ✅ Email-locked invite (recommended)
  if (invite.email.toLowerCase() !== primaryEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wrong account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            This invite was sent to <span className="font-medium">{invite.email}</span>.
            You’re signed in as <span className="font-medium">{primaryEmail || "unknown"}</span>.
          </div>
          <div className="text-xs text-muted-foreground">
            TODO: Add “sign out and switch account” helper later.
          </div>
          <Button asChild variant="secondary">
            <Link href="/portal">Go to portal</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Create link in DB (idempotent)
  await prisma.$transaction(async (tx) => {
    // If user already linked to some client, don’t overwrite silently.
    // TODO: Support multiple clients per user (requires schema updates).
    const existing = await tx.clientUser.findUnique({
      where: { clerkUserId: a.userId! },
      select: { id: true, clientId: true },
    });

    if (existing && existing.clientId !== invite.clientId) {
      // Keep safe: refuse rather than reassign.
      throw new Error("This account is already linked to a different client.");
    }

    await tx.clientUser.upsert({
      where: { clerkUserId: a.userId! },
      create: {
        clerkUserId: a.userId!,
        clientId: invite.clientId,
        role: invite.role,
      },
      update: {
        clientId: invite.clientId,
        role: invite.role,
      },
    });

    await tx.clientInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  redirect("/portal");
}