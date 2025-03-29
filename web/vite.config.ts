import suidPlugin from "@suid/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import tsconfigPaths from "vite-tsconfig-paths"

import { GenerateCounstantsPlugin } from "./plugins/generate_constants"

export default defineConfig({
  plugins: [
    solidPlugin(),
    suidPlugin(),
    tailwindcss(),
    TanStackRouterVite({ target: "solid", autoCodeSplitting: true }),
    tsconfigPaths(),
    GenerateCounstantsPlugin("http://localhost:12345"),
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
