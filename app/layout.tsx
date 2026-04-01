import type { Metadata } from "next";
import "./globals.css";
import PresenceTracker from "@/components/PresenceTracker";
import NavbarServer from "@/components/layout/NavbarServer";
import Footer from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata: Metadata = {
  title: {
    default: "WorkConnect",
    template: "%s | WorkConnect",
  },
  description:
    "WorkConnect is a modern worker and hirer marketplace for finding local work, hiring trusted people, chatting in real time, and managing jobs with ease.",
  applicationName: "WorkConnect",
  keywords: [
    "WorkConnect",
    "workers",
    "hirers",
    "jobs",
    "local jobs",
    "hire workers",
    "find work",
    "marketplace",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <ToastProvider>
          <ConfirmProvider>
            <PresenceTracker />
            <ScrollToTop />

            <div className="relative flex min-h-screen flex-col">
              <NavbarServer />

              <main className="flex-1">
                <div className="mx-auto w-full max-w-[1600px]">
                  {children}
                </div>
              </main>

              <Footer />
            </div>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
