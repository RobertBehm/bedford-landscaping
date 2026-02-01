import Container from "@/components/site/Container";
import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { BUSINESS } from "@/lib/constants";
import LeadForm from "@/components/leads/LeadForm";

export default function HomePage() {
  return (
    <div>
      <section className="py-14">
        <Container>
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            <div className="space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Spring Cleanups & Lawn Care in {BUSINESS.primaryCity}
              </h1>
              <p className="text-zinc-600">
                Reliable one-man landscaping. Fast quotes. Clean results. From spring cleanups to mowing, mulching, and
                hedge trimming — we keep your property looking sharp.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Get a Quote
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                >
                  View Services
                </Link>
              </div>

              <div className="text-sm text-zinc-600">
                <div>
                  <span className="font-medium text-zinc-900">Phone:</span> {BUSINESS.phone}
                </div>
                <div>
                  <span className="font-medium text-zinc-900">Email:</span> {BUSINESS.email}
                </div>
              </div>
            </div>

            <LeadForm />
          </div>
        </Container>
      </section>

      <section className="py-14 border-t border-zinc-200">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">Services</h2>
          <p className="mt-2 text-zinc-600">Click a service to learn more and request a quote.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {SERVICES.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="rounded-xl border border-zinc-200 p-5 hover:bg-zinc-50"
              >
                <div className="font-medium">{s.name}</div>
                <div className="mt-1 text-sm text-zinc-600">{s.short}</div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-14 border-t border-zinc-200">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">Service Area</h2>
          <p className="mt-2 text-zinc-600">
            Manchester + nearby towns (Bedford, Goffstown, Hooksett, Londonderry). Ask if you’re close.
          </p>
        </Container>
      </section>
    </div>
  );
}
