import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// BASE_PATH lets the same build serve from a sub-path (e.g. /mystery/).
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "icon-192.png"],
      manifest: {
        name: "The Game Is Afoot",
        short_name: "Afoot",
        description: "An episodic Sherlock Holmes deduction game.",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f3e9d2",
        theme_color: "#f3e9d2",
        start_url: base,
        scope: base,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Engravings and effects are precached for offline play; music streams and is cached as it plays.
        globPatterns: ["**/*.{js,css,html,png,woff2,webp}", "audio/{pluck,reveal,discord,page,seal}.m4a"],
        runtimeCaching: [
          {
            // The director fetches each track whole, so a plain cache serves it offline.
            urlPattern: ({ url }) => url.pathname.endsWith(".m4a"),
            handler: "CacheFirst",
            options: { cacheName: "afoot-music", cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
  server: {
    // The sample case lives in /fixtures at the repo root.
    fs: { allow: [".."] },
  },
});
