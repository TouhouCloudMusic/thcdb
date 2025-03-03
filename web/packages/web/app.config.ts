import { defineConfig } from "@solidjs/start/config"
import devtools from "solid-devtools/vite"
import viteConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  vite: {
    plugins: [
      viteConfigPaths(),
      devtools({
        autoname: true,
      }),
    ],
    envPrefix: "PUB_",
    define: {
      "import.meta.vitest": "undefined",
    },
  },
  routeDir: "./route",
})
