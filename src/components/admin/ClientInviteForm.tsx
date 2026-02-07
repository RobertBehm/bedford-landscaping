"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClientInviteAction } from "@/lib/server-actions/invites";

type ClientRole = "OWNER" | "MEMBER";
const ROLES: ClientRole[] = ["OWNER", "MEMBER"];

export default function ClientInviteForm({
  clientId,
  defaultEmail,
}: {
  clientId: string;
  defaultEmail: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState<ClientRole>("OWNER");
  const [inviteUrl, setInviteUrl] = useState<string>("");

  const [isPending, startTransition] = useTransition();

  const fullUrl = useMemo(() => {
    if (!inviteUrl) return "";
    // NOTE: For local/staging/prod correctness:
    // TODO: Replace with env BASE_URL later.
    return `${window.location.origin}${inviteUrl}`;
  }, [inviteUrl]);

  function createInvite() {
    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }

    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("email", email);
    fd.set("role", role);

    startTransition(() => {
      void (async () => {
        const t = toast.loading("Creating invite...");

        const res = await createClientInviteAction(fd);
        toast.dismiss(t);

        if (!res.ok) {
          toast.error(res.error);
          return;
        }

        const url = res.data?.inviteUrl ?? "";
        setInviteUrl(url);

        toast.success("Invite created. Copy the link below.");
      })();
    });
  }

  async function copy() {
    if (!fullUrl) return;
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Copied invite link.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Portal invite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <div className="text-xs text-muted-foreground">Email (must match Clerk signup email)</div>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={isPending} />
        </div>

        <div className="grid gap-2">
          <div className="text-xs text-muted-foreground">Role</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ClientRole)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={isPending}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="text-xs text-muted-foreground">
            TODO: Add granular portal permissions later (view-only vs pay, etc.).
          </div>
        </div>

        <Button type="button" onClick={createInvite} disabled={isPending}>
          {isPending ? "Working..." : "Create invite link"}
        </Button>

        {inviteUrl ? (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-xs text-muted-foreground">Invite link</div>
            <div className="text-sm break-all">{fullUrl}</div>
            <Button type="button" variant="secondary" onClick={copy}>
              Copy
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}