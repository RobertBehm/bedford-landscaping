import { z } from "zod";

export const leadCreateSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().min(7, "Enter a valid phone"),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  service: z.string().optional().or(z.literal("")),
  message: z.string().min(5, "Tell us what you need"),
  sourceUrl: z.string().optional().or(z.literal("")),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
