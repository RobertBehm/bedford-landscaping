"use client";

import { useRef, useTransition } from "react";
import { SERVICES } from "@/lib/services";
import { BUSINESS } from "@/lib/constants";
import { createLeadAction } from "@/lib/server-actions/leads";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LeadForm() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get a Quote</CardTitle>
        <CardDescription>
          Tell us what you need and we’ll get back to you. ({BUSINESS.primaryCity})
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          ref={formRef}
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = formRef.current;
            if (!form) return;

            const fd = new FormData(form);

            startTransition(async () => {
              toast.dismiss();
              toast.loading("Submitting...");

              const res = await createLeadAction(fd);

              toast.dismiss();
              if (res.ok) {
                toast.success(res.message);
                form.reset();
              } else {
                toast.error(res.error);
              }
            });
          }}
        >
          {/* if you want to store where it came from */}
          <input type="hidden" name="sourceUrl" value={typeof window !== "undefined" ? window.location.href : ""} />

          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Your name" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" name="email" type="email" placeholder="you@email.com" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" placeholder="(603) 555-0123" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service">Service</Label>
            <select
              id="service"
              name="service"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue=""
              disabled={isPending}
            >
              <option value="">Select a service</option>
              {SERVICES.map((s) => (
                <option key={s.slug} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              className="min-h-[120px]"
              placeholder="What do you need done? When do you want it done?"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" name="address" placeholder="Street address" disabled={isPending} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" placeholder="Manchester" disabled={isPending} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" placeholder="NH" disabled={isPending} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" name="zip" placeholder="03101" disabled={isPending} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit"}
          </Button>

          <p className="text-xs text-muted-foreground">
            By submitting, you agree we may contact you by phone/text/email about your request.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
