import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Annex Mail - Shared Mailbox Platform",
  description:
    "A self-hosted business email dashboard and collaborative shared mailbox.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-50">
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
