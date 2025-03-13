import suidPlugin from "@suid/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss(), tsconfigPaths(), suidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
})
