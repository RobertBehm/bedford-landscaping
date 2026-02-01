import Link from "next/link";
import Container from "./Container";
import { BUSINESS } from "@/lib/constants";
import { SignedIn, SignedOut, SignInButton, UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="border-b">
      <Container>
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="font-semibold tracking-tight">
            {BUSINESS.name}
          </Link>

          <nav className="flex items-center gap-3">
            <Link className="text-sm hover:underline" href="/services">
              Services
            </Link>
            <Link className="text-sm hover:underline" href="/contact">
              Contact
            </Link>

            <SignedIn>
              <Link className="text-sm hover:underline" href="/dashboard">
                Dashboard
              </Link>
              <Link className="text-sm hover:underline" href="/admin/leads">
                Admin
              </Link>

              <OrganizationSwitcher
                appearance={{
                  elements: { rootBox: "hidden md:block" },
                }}
              />

              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="secondary">Sign in</Button>
              </SignInButton>
            </SignedOut>
          </nav>
        </div>
      </Container>
    </header>
  );
}
