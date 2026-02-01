import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";

export const metadata = {
  title: "Manchester Lawncare & Landscaping",
  description: "Spring cleanups, mowing, mulching, and trim work in Manchester, NH and nearby areas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-background text-foreground">
          <Navbar />
          <main className="min-h-[70vh]">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
