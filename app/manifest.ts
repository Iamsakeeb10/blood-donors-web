import type { MetadataRoute } from "next";
import { M } from "@/lib/messages";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: M.appNameFull,
    short_name: M.appName,
    description: M.description,
    start_url: "/",
    display: "standalone",
    background_color: "#FBF8F5",
    theme_color: "#C4271F",
    lang: "bn",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
