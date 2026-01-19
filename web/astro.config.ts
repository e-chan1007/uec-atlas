import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import icon from "astro-icon";

export default defineConfig({
  adapter: cloudflare(),
  output: "server",

  security: {
    checkOrigin: false,
  },

  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
