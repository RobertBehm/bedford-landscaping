// src/app/(admin)/admin/clients/page.tsx

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchParams = { q?: string };

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgAdmin();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const where: Prisma.ClientWhereInput | undefined = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const clients = await prisma.client.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clients</h2>
          <p className="text-sm text-muted-foreground">Your customer database.</p>
        </div>

        <form className="flex items-center gap-2">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, email..."
            className="w-full sm:w-[320px]"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {q ? (
            <Button asChild variant="ghost">
              <Link href="/admin/clients">Clear</Link>
            </Button>
          ) : null}
        </form>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Latest</CardTitle>
          <div className="text-xs text-muted-foreground">{clients.length} shown (max 200)</div>
        </CardHeader>

        <CardContent className="space-y-3">
          {clients.length === 0 ? (
            <div className="text-sm text-muted-foreground">No clients found.</div>
          ) : (
            clients.map((c) => (
              <Link
                key={c.id}
                href={`/admin/clients/${c.id}`}
                className="block rounded-lg border p-4 transition hover:bg-muted/40"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated {c.updatedAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                  </div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {c.phone || "—"}
                  {c.email ? ` • ${c.email}` : ""}
                </div>
                {c.tags ? (
                  <div className="mt-2 text-xs text-muted-foreground">Tags: {c.tags}</div>
                ) : null}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
