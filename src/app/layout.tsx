import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistraSW } from "@/components/RegistraSW";

export const metadata: Metadata = {
  title: "AgriHelp",
  description: "Assistenza tecnica per trattori e guide satellitari",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AgriHelp", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b1630",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="antialiased">
        {children}
        <RegistraSW />
      </body>
    </html>
  );
}
