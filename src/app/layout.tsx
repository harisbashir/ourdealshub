import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { themeInitScript } from "@/lib/theme-script";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "OurDealsHub — Curated Amazon Picks",
    template: "%s | OurDealsHub",
  },
  description:
    "Hand-picked products on Amazon, explained in plain words. As an Amazon Associate, OurDealsHub earns from qualifying purchases.",
  applicationName: "OurDealsHub",
  appleWebApp: { capable: true, title: "OurDealsHub", statusBarStyle: "default" },
  openGraph: {
    siteName: "OurDealsHub",
    type: "website",
    title: "OurDealsHub — Curated Amazon Picks",
    description:
      "Hand-picked products on Amazon, explained in plain words. As an Amazon Associate, OurDealsHub earns from qualifying purchases.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Content extends under the notch / home indicator; safe-area insets pad it
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
