import suidPlugin from "@suid/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    solidPlugin(),
    suidPlugin(),
    tailwindcss(),
    TanStackRouterVite({ target: "solid", autoCodeSplitting: true }),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
})
