import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "CanopyGuard — Supply Chain Deforestation Risk Tracker",
  description:
    "Satellite-based due diligence for global commodity supply chains. Detect canopy disturbance, prioritise supplier audits, and produce evidence for compliance teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-ink-50 text-ink-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
