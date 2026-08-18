import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { PostHogProvider } from "@/lib/analytics/posthog-provider";
import { SITE_URL, APP_NAME, APP_DESCRIPTION } from "@/lib/site-meta";

export const viewport: Viewport = {
  themeColor: "#f4ecd8",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Relative canonical: resolves per-route against metadataBase, so every page names
  // its slashless form as canonical. Needed because skipTrailingSlashRedirect (the
  // PostHog /ingest proxy prerequisite in next.config.mjs) makes /about/ and /about
  // both reachable — without this they'd be duplicate URLs to search engines.
  alternates: { canonical: "./" },
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
      <body data-design="monon-chalk" className="antialiased min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#221E1B] focus:text-[#f4ecd8] focus:font-semibold focus:rounded-lg"
        >
          Skip to content
        </a>
        <main id="main" className="flex-1 flex flex-col">
          {children}
        </main>
        <Analytics />
        {/* Ecosystem PostHog (plans/26 in gemini/witus): anonymous, memory-only,
            proxied via /ingest. Key read here in the Server Component and passed
            down; `?? null` keeps keyless deploys in the supported inert state. */}
        <PostHogProvider
          apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null}
          apiHost="/ingest"
        />
      </body>
    </html>
  );
}
