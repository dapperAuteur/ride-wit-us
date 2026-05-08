import type { Metadata, Viewport } from "next";
import { DesignSwitcher } from "@/components/design-switcher";

export const viewport: Viewport = {
  themeColor: "#f4ecd8",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "Monon Chalk",
  description: "Neighborhood mural meets ride poster — a warm-paper, riso-textured direction for RideWitUS.",
  icons: {
    icon: [
      { url: "/brand/03-type-dot/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/03-type-dot/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/03-type-dot/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/brand/03-type-dot/favicon-180.png",
  },
};

export default function MononChalkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-design="monon-chalk" className="flex flex-col min-h-screen">
      <DesignSwitcher currentSlug="monon-chalk" />
      {children}
    </div>
  );
}
