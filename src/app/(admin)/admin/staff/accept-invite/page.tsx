import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Staff invite acceptance
 *
 * TODO: Connect to Clerk Organizations if you decide to use org membership later.
 */
export default async function StaffAcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp.token ?? "").trim();
  if (!token) return redirect("/admin");

  const a = await auth();
  if (!a.userId) {
    redirect(`/sign-in?redirect_url=/staff/accept-invite?token=${encodeURIComponent(token)}`);
  }

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const primaryEmail = (user.emailAddresses?.[0]?.emailAddress ?? "").toLowerCase();

  const invite = await prisma.staffInvite.findUnique({
    where: { token },
  });

  if (!invite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">This staff invite is invalid.</div>
          <Button asChild variant="secondary">
            <Link href="/admin">Go to admin</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (invite.acceptedAt) {
    redirect("/admin");
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite expired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">Ask for a new invite link.</div>
          <Button asChild variant="secondary">
            <Link href="/admin">Go to admin</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ✅ Email-locked
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
          <Button asChild variant="secondary">
            <Link href="/admin">Go to admin</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffUser.upsert({
      where: { clerkUserId: a.userId! },
      create: {
        clerkUserId: a.userId!,
        role: invite.role,
      },
      update: {
        role: invite.role,
      },
    });

    await tx.staffInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  redirect("/admin");
}