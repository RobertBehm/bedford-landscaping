import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import ExpensesPageClient, { type ExpenseRow, type ClientOption, type JobOption } from "@/components/admin/ExpensesPageClient";

function utcDisplay(d: Date) {
  const iso = d.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

export default async function AdminExpensesPage() {
  await requireOrgAdmin();

  const [expenses, clients, jobs] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { occurredAt: "desc" },
      take: 200,
      include: {
        client: { select: { id: true, name: true } },
        job: { select: { id: true, title: true } },
      },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    }),
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
      take: 200,
    }),
  ]);

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    occurredAtIso: e.occurredAt.toISOString(),
    occurredAtDisplay: utcDisplay(e.occurredAt),
    category: e.category as any,
    vendor: e.vendor,
    memo: e.memo,
    amountCents: e.amountCents,
    client: e.client ? { id: e.client.id, name: e.client.name } : null,
    job: e.job ? { id: e.job.id, title: e.job.title } : null,
  }));

  const clientOptions: ClientOption[] = clients.map((c) => ({ id: c.id, name: c.name }));
  const jobOptions: JobOption[] = jobs.map((j) => ({ id: j.id, title: j.title }));

  return <ExpensesPageClient rows={rows} clients={clientOptions} jobs={jobOptions} />;
}