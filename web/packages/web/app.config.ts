/// <reference types="vitest" />
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
		resolve: {
			conditions: ["development", "browser"],
		},
		envPrefix: "PUB_",
		test: {
			browser: {
				enabled: true,
				name: "chrome",
				headless: true,
			},
			include: ["test/dom/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		},
	},
	routeDir: "./route",
})
