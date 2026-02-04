"use client";

import { useMemo, useState } from "react";
import LeadDrawer, { type LeadSummaryForDrawer } from "@/components/admin/LeadDrawer";
import UpdateLeadStatusForm from "@/components/leads/UpdateLeadStatusForm";
import { cn } from "@/lib/utils";

type LeadRow = LeadSummaryForDrawer;

function formatDT(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function LeadsListClient({ leads }: { leads: LeadRow[] }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return leads.find((l) => l.id === selectedId) ?? null;
  }, [selectedId, leads]);

  function openLead(id: string) {
    setSelectedId(id);
    setOpen(true);
  }

  return (
    <>
      <div className="space-y-3">
        {leads.map((l) => (
          <div
            key={l.id}
            role="button"
            tabIndex={0}
            onClick={() => openLead(l.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openLead(l.id);
              }
            }}
            className={cn(
              "w-full rounded-lg border p-4 text-left",
              "cursor-pointer select-none transition hover:bg-muted/40",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            )}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{formatDT(l.createdAt)}</div>
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

                <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {l.message}
                </div>
              </div>

              {/* Prevent row click when interacting with controls */}
              <div
                className="flex flex-col gap-2 md:items-end"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <UpdateLeadStatusForm leadId={l.id} status={l.status} />
                {l.sourceUrl ? (
                  <a
                    href={l.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Source
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <LeadDrawer open={open} onOpenChange={setOpen} lead={selected} />
    </>
  );
}
