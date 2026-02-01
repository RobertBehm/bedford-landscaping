import { Badge } from "@/components/ui/badge";
import { LeadStatus } from "@prisma/client";

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const variantByStatus: Record<LeadStatus, "default" | "secondary" | "outline" | "destructive"> = {
    NEW: "default",
    CONTACTED: "secondary",
    SCHEDULED: "outline",
    COMPLETED: "secondary",
    ARCHIVED: "outline",
  };

  return <Badge variant={variantByStatus[status]}>{status}</Badge>;
}
