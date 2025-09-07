import { lingui as linguiSolidPlugin } from "@lingui-solid/vite-plugin"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, loadEnv } from "vite"
import babelMacrosPlugin from "vite-plugin-babel-macros"
import solidPlugin from "vite-plugin-solid"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineProject } from "vitest/config"

import { generatePlugin } from "./plugins/generate"

const dirname =
	typeof __dirname == "undefined"
		? path.dirname(fileURLToPath(import.meta.url))
		: // oxlint-disable-next-line no-undef
			__dirname

// oxlint-disable-next-line no-default-export
export default defineConfig(({ mode }) => {
	// oxlint-disable-next-line no-undef
	const env = loadEnv(mode, process.cwd())
	// oxlint-disable-next-line no-undef

	const isTest = mode == "test"

	const SERVER_URL = env["VITE_SERVER_URL"]

	return {
		plugins: [
			tanstackRouter({ target: "solid", autoCodeSplitting: true }),
			babelMacrosPlugin(),
			linguiSolidPlugin(),
			solidPlugin(),
			tailwindcss(),
			tsconfigPaths(),
			generatePlugin(SERVER_URL, isTest),
		],
		server: {
			port: 3000,
			proxy: {
				"/api": {
					target: SERVER_URL,
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/api/, ""),
				},
			},
		},
		build: {
			target: "esnext",
		},
		test: {
			projects: [
				defineProject({
					test: {
						name: "unit",
						globals: true,
						include: ["src/**/*.test.{ts,tsx}"],
					},
				}),
				defineProject({
					plugins: [
						// The plugin will run tests for the stories defined in your Storybook config
						// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
						storybookTest({
							configDir: path.join(dirname, ".storybook"),
						}),
					],
					test: {
						name: "storybook",
						browser: {
							// Enable browser-based testing for UI components
							enabled: true,
							headless: true,
							provider: "playwright",
							instances: [{ browser: "chromium" }],
						},
						// This setup file applies Storybook project annotations for Vitest
						// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
						setupFiles: [".storybook/vitest.setup.ts"],
					},
				}),
			],
		},
	}
})
