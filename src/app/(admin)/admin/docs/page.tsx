import { requireOrgAdmin } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDocsPage() {
  await requireOrgAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Internal Docs</h2>
        <p className="text-sm text-muted-foreground">
          Operator & developer notes for this system. Not user-facing.
        </p>
      </div>

      {/* PURPOSE */}
      <Card>
        <CardHeader>
          <CardTitle>Purpose of This App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            This application is the internal operating system for the landscaping
            business. It replaces spreadsheets, text messages, and guesswork.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Lead intake → client conversion</li>
            <li>Job scheduling & execution</li>
            <li>Invoicing, payments, autopay</li>
            <li>Client portal</li>
            <li>Employee access (planned)</li>
            <li>Profit & bottleneck visibility</li>
          </ul>
        </CardContent>
      </Card>

      {/* TECH STACK */}
      <Card>
        <CardHeader>
          <CardTitle>Tech Stack</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>Framework: Next.js (App Router)</div>
          <div>Auth: Clerk</div>
          <div>Database: PostgreSQL (Neon)</div>
          <div>ORM: Prisma</div>
          <div>Payments: Stripe (PaymentIntents + SetupIntents)</div>
          <div>UI: Tailwind + shadcn/ui</div>
          <div>Hosting: Vercel</div>
          <div>Region / Currency: US / USD</div>
        </CardContent>
      </Card>

      {/* AUTH MODEL */}
      <Card>
        <CardHeader>
          <CardTitle>Auth & Roles (Critical)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Clerk authenticates users, but the database determines what they can
            actually access. Auth helpers are mandatory.
          </p>

          <div>
            <strong>User types:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <strong>Org Admin</strong> — full access to admin UI and data
              </li>
              <li>
                <strong>Employee (planned)</strong> — limited admin access
                (jobs, schedules, tasks)
              </li>
              <li>
                <strong>Client</strong> — portal-only access to their own jobs,
                invoices, billing
              </li>
            </ul>
          </div>

          <div>
            <strong>Required helpers:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <code>requireOrgAdmin()</code> → all <code>/admin</code> routes
              </li>
              <li>
                <code>requireClientUser()</code> → all <code>/portal</code> routes
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* DATA FLOW */}
      <Card>
        <CardHeader>
          <CardTitle>Core Data Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            The system follows a strict progression. Breaking this mental model
            causes bugs.
          </p>
          <div className="font-mono text-sm">
            Lead → Client → Job → Invoice → Payment → Ledger
          </div>
          <p>
            Stripe is the source of truth for payments. The database is updated
            via webhooks only.
          </p>
        </CardContent>
      </Card>

      {/* STRIPE RULES */}
      <Card>
        <CardHeader>
          <CardTitle>Stripe Rules (Do Not Violate)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>Never mark invoices paid on the client alone</li>
            <li>Always wait for Stripe webhooks</li>
            <li>
              Always create intents with:
              <pre className="mt-2 rounded bg-muted p-2 text-xs">
{`automatic_payment_methods: {
  enabled: true,
  allow_redirects: "never",
}`}
              </pre>
            </li>
            <li>UI updates via <code>router.refresh()</code></li>
          </ul>
        </CardContent>
      </Card>

      {/* AUTOPAY */}
      <Card>
        <CardHeader>
          <CardTitle>Autopay Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Autopay runs immediately when an invoice is created if:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Client has autopay enabled</li>
            <li>Stripe customer exists</li>
            <li>Default card exists</li>
          </ul>
          <p>
            If authentication is required, the attempt is logged and the client
            must pay via the portal.
          </p>
        </CardContent>
      </Card>

      {/* DEV NOTES */}
      <Card>
        <CardHeader>
          <CardTitle>Development Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>Always add <code>TODO:</code> comments for deferred work</li>
            <li>Prefer server actions over API routes</li>
            <li>Server = source of truth</li>
            <li>No silent permissions — always gate routes</li>
            <li>Stripe → webhook → DB → UI (always)</li>
          </ul>
        </CardContent>
      </Card>

      {/* ROADMAP */}
      <Card>
        <CardHeader>
          <CardTitle>Near-Term Roadmap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>Client invite onboarding</li>
            <li>Employee roles & permissions</li>
            <li>Profit dashboards</li>
            <li>PDF invoices</li>
            <li>Email / SMS notifications</li>
            <li>Cron jobs (reminders, retries)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}