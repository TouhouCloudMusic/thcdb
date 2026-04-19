import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, loadEnv } from "vite"
import { defineProject } from "vitest/config"

import { createAppPlugins } from "./vite.shared"

const dirname = path.dirname(fileURLToPath(import.meta.url))
const isHttps = (url: string | undefined) => {
	if (!url) {
		return false
	}

	return new URL(url).protocol == "https:"
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd())

	const SERVER_URL = env["VITE_SERVER_URL"]
	const testPlugins = createAppPlugins()

	return {
		plugins: createAppPlugins(),
		experimental: {
			// bundledDev: true,
		},
		server: {
			port: 3000,
			strictPort: true,
			proxy: {
				"/api": {
					target: SERVER_URL,
					changeOrigin: true,
					secure: isHttps(SERVER_URL),
					rewrite: (url) => url.replace(/^\/api/, ""),
				},
			},
			forwardConsole: true,
		},
		resolve: {
			tsconfigPaths: true,
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
					plugins: testPlugins,
					resolve: {
						tsconfigPaths: true,
					},
					test: {
						name: "unit",
						globals: true,
						include: ["./src/**/*.test.{ts,tsx}"],
						setupFiles: ["./src/test/vitest.setup.ts"],
					},
				}),
				defineProject({
					plugins: [
						...testPlugins,
						// The plugin will run tests for the stories defined in your Storybook config
						// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
						storybookTest({
							configDir: path.join(dirname, ".storybook"),
						}),
					],
					resolve: {
						tsconfigPaths: true,
					},
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
						setupFiles: ["./src/test/vitest.setup.ts"],
					},
				}),
			],
		},
	}
})
