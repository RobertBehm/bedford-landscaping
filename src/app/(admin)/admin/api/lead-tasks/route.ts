import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";

function utcDisplayFromDate(d: Date) {
  // stable across server/client: ISO slice
  const iso = d.toISOString(); // 2026-02-04T18:22:00.000Z
  return iso.replace("T", " ").slice(0, 16) + " UTC"; // 2026-02-04 18:22 UTC
}

export async function GET(req: Request) {
  await requireOrgAdmin();

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId")?.trim();

  if (!leadId) {
    return NextResponse.json({ tasks: [] }, { status: 200 });
  }

  const tasks = await prisma.task.findMany({
    where: { leadId },
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
    take: 100,
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      body: t.body,

      dueAtIso: t.dueAt.toISOString(),
      dueAtDisplay: utcDisplayFromDate(t.dueAt),

      priority: t.priority,
      recurrence: t.recurrence,

      completedAtIso: t.completedAt ? t.completedAt.toISOString() : null,
      leadId: t.leadId,
    })),
  });
}
