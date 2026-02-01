import Container from "./Container";
import { BUSINESS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 mt-16">
      <Container>
        <div className="py-10 text-sm text-zinc-600 flex flex-col gap-2">
          <div className="font-medium text-zinc-900">{BUSINESS.name}</div>
          <div>{BUSINESS.primaryCity}</div>
          <div>
            <span className="font-medium text-zinc-900">Phone:</span> {BUSINESS.phone}
          </div>
          <div>
            <span className="font-medium text-zinc-900">Email:</span> {BUSINESS.email}
          </div>
          <div className="pt-4 text-xs text-zinc-500">
            © {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
          </div>
        </div>
      </Container>
    </footer>
  );
}
