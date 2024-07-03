/// <reference types="vitest" />
import { defineConfig } from "@solidjs/start/config"
import viteConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
	vite: {
		plugins: [viteConfigPaths()],
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
