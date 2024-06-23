// @ts-check
import { defineConfig } from "@solidjs/start/config"
import viteConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
	vite: {
		plugins: [viteConfigPaths()],
	},
	routeDir: "./route",
})
