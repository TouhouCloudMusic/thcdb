import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { playwright } from "@vitest/browser-playwright"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, loadEnv } from "vite"
import babelMacrosPlugin from "vite-plugin-babel-macros"
import solidPlugin from "vite-plugin-solid"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineProject } from "vitest/config"

const dirname =
	typeof __dirname == "undefined"
		? path.dirname(fileURLToPath(import.meta.url))
		: __dirname

const isHttps = (url: string | undefined) => {
	if (!url) {
		return false
	}

	return new URL(url).protocol == "https:"
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd())

	const SERVER_URL = env["VITE_SERVER_URL"]

	return {
		plugins: [
			devtools(),

			tanstackRouter({
				target: "solid",
				autoCodeSplitting: true,
				routesDirectory: "src/route",
			}),
			babelMacrosPlugin(),
			solidPlugin(),
			tailwindcss(),
			// TODO: vite 8 resolve.tsconfigPaths
			tsconfigPaths(),
		],
		server: {
			port: 3000,
			proxy: {
				"/api": {
					target: SERVER_URL,
					changeOrigin: true,
					secure: isHttps(SERVER_URL),
					rewrite: (url) => url.replace(/^\/api/, ""),
				},
			},
		},
		build: {
			target: "esnext",
			rolldownOptions: {
				experimental: {
					lazyBarrel: true,
				},
			},
		},
		test: {
			projects: [
				defineProject({
					test: {
						name: "unit",
						globals: true,
						include: ["./src/**/*.test.{ts,tsx}"],
					},
					plugins: [tsconfigPaths()],
				}),
				defineProject({
					plugins: [
						// The plugin will run tests for the stories defined in your Storybook config
						// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
						storybookTest({
							configDir: path.join(dirname, ".storybook"),
						}),
						tsconfigPaths(),
					],
					test: {
						name: "storybook",
						exclude: ["src/component/__legacy/**"],
						browser: {
							// Enable browser-based testing for UI components
							enabled: true,
							headless: true,
							provider: playwright(),
							instances: [{ browser: "chromium" }],
						},
						setupFiles: ["./.storybook/vitest.setup.ts"],
					},
				}),
			],
		},
	}
})
