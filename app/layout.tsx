import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "sriraghav1510.github.io";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "Boldfit Roster | Store Operations";
  const description =
    "Plan shifts, secure attendance, automate coverage, and run every Boldfit store with live workforce intelligence.";

  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: "Boldfit Roster",
    keywords: [
      "Boldfit",
      "store roster",
      "attendance",
      "workforce planning",
      "retail operations",
    ],
    openGraph: {
      type: "website",
      title,
      description,
      url: origin,
      siteName: "Boldfit Roster",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1200,
          height: 630,
          alt: "Boldfit Roster OS — Plan. Punch. Perform.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
