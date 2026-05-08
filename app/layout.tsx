import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL, APP_NAME, APP_DESCRIPTION } from "@/lib/site-meta";

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  title: {
    default: `${APP_NAME} — The Brompton classroom`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  icons: {
    icon: [
      { url: "/brand/04-orbit-type/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/04-orbit-type/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/04-orbit-type/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/brand/04-orbit-type/favicon-180.png",
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} — The Brompton classroom`,
    description: APP_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — The Brompton classroom`,
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-950 focus:font-semibold focus:rounded-lg"
        >
          Skip to content
        </a>
        <main id="main" className="flex-1 flex flex-col">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
