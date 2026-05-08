import type { Metadata, Viewport } from "next";
import { DesignSwitcher } from "@/components/design-switcher";

export const viewport: Viewport = {
  themeColor: "#ece1c8",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "Workshop Apron",
  description: "Vocational manual meets zine — a kraft-paper, ink-and-apron-color direction for RideWitUS.",
  icons: {
    icon: [
      { url: "/brand/02-duality/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/02-duality/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/02-duality/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/brand/02-duality/favicon-180.png",
  },
};

export default function WorkshopApronLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-design="workshop-apron" className="flex flex-col min-h-screen">
      <DesignSwitcher currentSlug="workshop-apron" />
      {children}
    </div>
  );
}
