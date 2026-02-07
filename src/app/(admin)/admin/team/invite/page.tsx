import { requireOrgAdmin } from "@/lib/authz";
import StaffInviteForm from "@/components/admin/StaffInviteForm";

export default async function AdminTeamInvitePage() {
  await requireOrgAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Invite employee</h2>
        <p className="text-sm text-muted-foreground">
          Invite staff into limited admin access (jobs, invoices, schedules, etc.).
        </p>
      </div>

      <StaffInviteForm />

      <div className="text-xs text-muted-foreground">
        TODO: Add team list + revoke invites + role changes + permissions.
      </div>
    </div>
  );
}