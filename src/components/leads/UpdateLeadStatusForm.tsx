"use client";

import { useState } from "react";
import { LeadStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { updateLeadStatusAction } from "@/lib/server-actions/leads";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UpdateLeadStatusForm({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [value, setValue] = useState<LeadStatus>(status);

  return (
    <form action={updateLeadStatusAction} className="flex items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="status" value={value} />

      <Select value={value} onValueChange={(v) => setValue(v as LeadStatus)}>
        <SelectTrigger className="w-[160px]">
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

      <Button type="submit" size="sm">
        Save
      </Button>
    </form>
  );
}
