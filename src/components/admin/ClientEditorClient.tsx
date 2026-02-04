"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { addClientAddressAction, deleteClientAddressAction, updateClientAction } from "@/lib/server-actions/clients";

type ClientAddressView = {
  id: string;
  label: string | null;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  gateCode: string | null;
  notes: string | null;
  isPrimary: boolean;
  createdAtDisplay: string;
};

export default function ClientEditorClient({
  client,
}: {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tags: string | null;
    notes: string | null;
    addresses: ClientAddressView[];
  };
}) {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [tags, setTags] = useState(client.tags ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");

  // address form
  const [label, setLabel] = useState("Primary");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("NH");
  const [zip, setZip] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [addrNotes, setAddrNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Client Info</CardTitle>
          <Button
            disabled={isPending}
            onClick={() => {
              const fd = new FormData();
              fd.set("clientId", client.id);
              fd.set("name", name);
              fd.set("email", email);
              fd.set("phone", phone);
              fd.set("tags", tags);
              fd.set("notes", notes);

              startTransition(async () => {
                const loadingId = toast.loading("Saving...");
                const res = await updateClientAction(fd);
                toast.dismiss(loadingId);
                if (res.ok) toast.success(res.message);
                else toast.error(res.error);
              });
            }}
          >
            Save
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Phone</div>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isPending} />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Email</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={isPending} />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Tags (comma separated)</div>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} disabled={isPending} />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Internal Notes</div>
            <Textarea
              className="min-h-[120px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Addresses</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {client.addresses.length === 0 ? (
            <div className="text-sm text-muted-foreground">No addresses yet.</div>
          ) : (
            <div className="space-y-3">
              {client.addresses.map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{a.label ?? "Address"}</div>
                      {a.isPrimary ? <Badge variant="secondary">Primary</Badge> : null}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("clientId", client.id);
                        fd.set("addressId", a.id);

                        startTransition(async () => {
                          const loadingId = toast.loading("Deleting...");
                          const res = await deleteClientAddressAction(fd);
                          toast.dismiss(loadingId);
                          if (res.ok) toast.success(res.message);
                          else toast.error(res.error);
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </div>

                  <div className="mt-1 text-sm text-muted-foreground">
                    {a.address}
                    {a.city ? `, ${a.city}` : ""}
                    {a.state ? `, ${a.state}` : ""}
                    {a.zip ? ` ${a.zip}` : ""}
                  </div>

                  {a.gateCode ? (
                    <div className="mt-1 text-xs text-muted-foreground">Gate: {a.gateCode}</div>
                  ) : null}

                  {a.notes ? (
                    <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{a.notes}</div>
                  ) : null}

                  <div className="mt-2 text-xs text-muted-foreground">Added {a.createdAtDisplay}</div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="rounded-lg border p-3 space-y-3">
            <div className="text-sm font-medium">Add Address</div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">Label</div>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} disabled={isPending} />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">Primary?</div>
                <select
                  value={String(isPrimary)}
                  onChange={(e) => setIsPrimary(e.target.value === "true")}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={isPending}
                >
                  <option value="true">Yes (make primary)</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <div className="text-xs text-muted-foreground">Address</div>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={isPending} />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">City</div>
                <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={isPending} />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">State</div>
                <Input value={state} onChange={(e) => setState(e.target.value)} disabled={isPending} />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">Zip</div>
                <Input value={zip} onChange={(e) => setZip(e.target.value)} disabled={isPending} />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">Gate Code</div>
                <Input value={gateCode} onChange={(e) => setGateCode(e.target.value)} disabled={isPending} />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <div className="text-xs text-muted-foreground">Notes</div>
                <Textarea
                  className="min-h-[80px]"
                  value={addrNotes}
                  onChange={(e) => setAddrNotes(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={isPending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("clientId", client.id);
                  fd.set("label", label);
                  fd.set("address", address);
                  fd.set("city", city);
                  fd.set("state", state);
                  fd.set("zip", zip);
                  fd.set("gateCode", gateCode);
                  fd.set("notes", addrNotes);
                  fd.set("isPrimary", String(isPrimary));

                  startTransition(async () => {
                    const loadingId = toast.loading("Adding address...");
                    const res = await addClientAddressAction(fd);
                    toast.dismiss(loadingId);
                    if (res.ok) {
                      toast.success(res.message);
                      setAddress("");
                      setCity("");
                      setZip("");
                      setGateCode("");
                      setAddrNotes("");
                    } else toast.error(res.error);
                  });
                }}
              >
                Add Address
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
