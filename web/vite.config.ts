import suidPlugin from "@suid/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import tsconfigPaths from "vite-tsconfig-paths"

import { generatePlugin } from "./plugins/generate"

export default defineConfig({
  plugins: [
    solidPlugin(),
    suidPlugin(),
    tailwindcss(),
    TanStackRouterVite({ target: "solid", autoCodeSplitting: true }),
    tsconfigPaths(),
    generatePlugin("http://localhost:12345"),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:12345",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    target: "esnext",
  },
})
