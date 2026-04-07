import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "ACCAI™ — VILLACLUB",
  description: "Sistema de inteligencia estratégica VILLACLUB",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark antialiased" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-base)]" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
