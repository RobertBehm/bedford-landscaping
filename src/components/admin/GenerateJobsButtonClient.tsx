"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateUpcomingJobsAction } from "@/lib/server-actions/service-plans";

export default function GenerateJobsButtonClient({ planId }: { planId?: string }) {
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const fd = new FormData();
      fd.set("daysAhead", "14");
      if (planId) fd.set("planId", planId);

      const loadingId = toast.loading("Generating jobs...");
      const res = await generateUpcomingJobsAction(fd);
      toast.dismiss(loadingId);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
      // TODO: show a summary dialog (created count, skipped duplicates, etc.)
      // simplest MVP: rely on revalidate + user sees jobs appear
      window.location.reload();
    });
  }

  return (
    <Button onClick={run} disabled={pending} variant="secondary">
      {pending ? "Generating..." : "Generate Jobs (14 days)"}
    </Button>
  );
}
