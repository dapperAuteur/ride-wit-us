import type { Metadata, Viewport } from "next";
import { DesignSwitcher } from "@/components/design-switcher";

export const viewport: Viewport = {
  themeColor: "#f5f0e6",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "Folder & Frame",
  description: "Engineering studio meets design museum — a cream-and-Brompton-orange direction for RideWitUS.",
  icons: {
    icon: [
      { url: "/brand/01-orbit/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/01-orbit/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/01-orbit/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/brand/01-orbit/favicon-180.png",
  },
};

export default function FolderAndFrameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-design="folder-and-frame" className="flex flex-col min-h-screen">
      <DesignSwitcher currentSlug="folder-and-frame" />
      {children}
    </div>
  );
}
