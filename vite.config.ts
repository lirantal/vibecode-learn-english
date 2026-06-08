import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";

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
      siteMetadataPlugin(siteUrl),
    ],
    server: {
      port: 5959,
      host: true,
    },
  };
});
