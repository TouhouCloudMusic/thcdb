/// <reference types="vitest" />
import { defineConfig } from "@solidjs/start/config"
import viteConfigPaths from "vite-tsconfig-paths"
import devtools from "solid-devtools/vite"
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
		build: {
			rollupOptions: {
				output: {
					manualChunks: {
						// "@touhouclouddb/database": ["@touhouclouddb/database"],
					},
				},
			},
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
