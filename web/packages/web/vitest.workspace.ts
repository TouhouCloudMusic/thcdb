/// <reference types="vitest" />
import solid from "vite-plugin-solid"
import viteConfigPaths from "vite-tsconfig-paths"
import { defineWorkspace } from "vitest/config"

export default defineWorkspace([
	// Web
	{
		plugins: [solid(), viteConfigPaths()],
		build: {
			target: "esnext",
		},
		test: {
			browser: {
				provider: "playwright",
				enabled: true,
				name: "chromium",
				headless: true,
			},

			include: ["test/dom/**/*.{test,vitest}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
			deps: {
				inline: ["solid-testing-library"],
			},
		},
		resolve: {
			conditions: ["development", "browser"],
		},
	},
	// lib
	{
		plugins: [viteConfigPaths()],
		test: {
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/cypress/**",
				"**/.{idea,git,cache,output,temp}/**",
				"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
				"test",
			],
			includeSource: ["src/**/*.ts"],
			globalSetup: ["test/setup_vitest.ts"],
		},
	},
])
