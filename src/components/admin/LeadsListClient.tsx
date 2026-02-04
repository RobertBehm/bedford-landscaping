"use client";

import { useMemo, useState } from "react";
import LeadDrawer, { type LeadSummaryForDrawer } from "@/components/admin/LeadDrawer";

export default function LeadsListClient({
  leads,
}: {
  leads: LeadSummaryForDrawer[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LeadSummaryForDrawer | null>(null);

  const sorted = useMemo(() => leads, [leads]);

  return (
    <>
      <div className="space-y-3">
        {sorted.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              setSelected(l);
              setOpen(true);
            }}
            className="w-full text-left rounded-lg border p-4 transition hover:bg-muted/40"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{l.name}</div>

                  {/* ✅ Use pre-formatted display string (server-safe, no locale mismatch) */}
                  <div className="text-xs text-muted-foreground">{l.createdAtDisplay}</div>

                  {/* Optional: show converted badge */}
                  {l.clientId ? (
                    <div className="text-xs rounded-md border px-2 py-0.5 text-muted-foreground">
                      Client
                    </div>
                  ) : null}
                </div>

                <div className="mt-1 text-sm text-muted-foreground">
                  {l.phone}
                  {l.email ? ` • ${l.email}` : ""}
                  {l.city ? ` • ${l.city}` : ""}
                  {l.state ? `, ${l.state}` : ""}
                </div>

                <div className="mt-2 text-sm">
                  <span className="font-medium">Service:</span> {l.service || "—"}
                </div>

                <div className="mt-2 text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                  {l.message}
                </div>
              </div>

              <div className="mt-2 md:mt-0">
                <div className="text-xs rounded-md border px-2 py-1 inline-flex">
                  {String(l.status)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <LeadDrawer
        open={open}
        onOpenChange={setOpen}
        lead={selected}
      />
    </>
  );
}
