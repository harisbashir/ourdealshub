import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { themeInitScript } from "@/lib/theme-script";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "OurDealsHub — Curated Amazon Deals",
    template: "%s | OurDealsHub",
  },
  description:
    "Curated Amazon product picks. As an Amazon Associate, OurDealsHub earns from qualifying purchases. Prices and availability may change on Amazon.",
  openGraph: {
    siteName: "OurDealsHub",
    type: "website",
    title: "OurDealsHub — Curated Amazon Deals",
    description:
      "Curated Amazon product picks. As an Amazon Associate, OurDealsHub earns from qualifying purchases.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${dmSans.className} antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
