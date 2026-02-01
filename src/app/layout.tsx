// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Manchester Lawncare & Landscaping",
    template: "%s | Manchester Lawncare & Landscaping",
  },
  description:
    "Professional lawn care, spring cleanups, mulching, and landscaping services in Manchester, NH and surrounding areas.",
  metadataBase: new URL("https://auburnlandscaping.com"), // change later if needed
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-background text-foreground">
          {children}
          <Toaster richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
