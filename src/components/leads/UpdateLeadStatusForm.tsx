"use client";

import { useState, useTransition } from "react";
import { LeadStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { updateLeadStatusAction } from "@/lib/server-actions/leads";

export default function UpdateLeadStatusForm({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const [value, setValue] = useState<LeadStatus>(status);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const fd = new FormData();
        fd.set("leadId", leadId);
        fd.set("status", value);

        startTransition(async () => {
          toast.dismiss();
          toast.loading("Saving...");

          const res = await updateLeadStatusAction(fd);

          toast.dismiss();
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
        });
      }}
      className="flex items-center gap-2"
    >
      <Select value={value} onValueChange={(v) => setValue(v as LeadStatus)} disabled={isPending}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NEW">NEW</SelectItem>
          <SelectItem value="CONTACTED">CONTACTED</SelectItem>
          <SelectItem value="SCHEDULED">SCHEDULED</SelectItem>
          <SelectItem value="COMPLETED">COMPLETED</SelectItem>
          <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
        </SelectContent>
      </Select>

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
