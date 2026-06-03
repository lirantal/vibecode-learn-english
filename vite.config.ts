import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

function normalizeSiteUrl(value: string | undefined): string {
  const trimmed = value?.trim().replace(/\/+$/, "");
  return trimmed || "/";
}

function publicUrl(siteUrl: string, path: string): string {
  return siteUrl === "/" ? path : `${siteUrl}${path}`;
}

function siteMetadataPlugin(siteUrl: string): PluginOption {
  return {
    name: "site-metadata",
    transformIndexHtml(html) {
      return html
        .replaceAll("%SITE_URL%", siteUrl)
        .replaceAll("%OG_IMAGE_URL%", publicUrl(siteUrl, "/og-image.png"));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL);

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        manifestFilename: "site.webmanifest",
        includeAssets: [
          "favicon.svg",
          "favicon-16x16.png",
          "favicon-32x32.png",
          "apple-touch-icon.png",
        ],
        manifest: {
          name: "מרכז למידה",
          short_name: "למידה",
          description: "אפליקציית למידה מודולרית לתלמידים דוברי עברית.",
          lang: "he",
          dir: "rtl",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#0f172a",
          theme_color: "#0f172a",
          icons: [
            {
              src: "/favicon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
            {
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
      siteMetadataPlugin(siteUrl),
    ],
    server: {
      port: 5959,
      host: true,
    },
  };
});
