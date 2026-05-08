import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/site-meta";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_TAGLINE,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    orientation: "portrait",
    icons: [
      {
        src: "/brand/04-orbit-type/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/04-orbit-type/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/brand/04-orbit-type/favicon-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
