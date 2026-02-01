import { SERVICES } from "@/lib/services";
import { BUSINESS } from "@/lib/constants";
import { leadCreateSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

async function createLead(formData: FormData) {
  "use server";

  const raw = {
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    address: String(formData.get("address") || ""),
    city: String(formData.get("city") || ""),
    state: String(formData.get("state") || ""),
    zip: String(formData.get("zip") || ""),
    service: String(formData.get("service") || ""),
    message: String(formData.get("message") || ""),
    sourceUrl: String(formData.get("sourceUrl") || ""),
  };

  const parsed = leadCreateSchema.safeParse(raw);
  if (!parsed.success) {
    // For now: silently fail. Next step: show errors with useFormState/useFormStatus.
    return;
  }

  await prisma.lead.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email?.trim() ? parsed.data.email.trim() : null,
      phone: parsed.data.phone.trim(),
      address: parsed.data.address?.trim() ? parsed.data.address.trim() : null,
      city: parsed.data.city?.trim() ? parsed.data.city.trim() : null,
      state: parsed.data.state?.trim() ? parsed.data.state.trim() : null,
      zip: parsed.data.zip?.trim() ? parsed.data.zip.trim() : null,
      service: parsed.data.service?.trim() ? parsed.data.service.trim() : null,
      message: parsed.data.message.trim(),
      sourceUrl: parsed.data.sourceUrl?.trim() ? parsed.data.sourceUrl.trim() : null,
    },
  });
}

export default function LeadForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Get a Quote</CardTitle>
        <CardDescription>
          Tell us what you need and we’ll get back to you. ({BUSINESS.primaryCity})
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={createLead} className="grid gap-4">
          <input type="hidden" name="sourceUrl" value="" />

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
            {/* Native select is perfectly fine for forms. If you want shadcn Select, we’ll do it with client state. */}
            <select
              id="service"
              name="service"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue=""
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
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" name="address" placeholder="Street address" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" placeholder="Manchester" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" placeholder="NH" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" name="zip" placeholder="03101" />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Submit
          </Button>

          <p className="text-xs text-muted-foreground">
            By submitting, you agree we may contact you by phone/text/email about your request.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
