import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import { msw } from "msw/vite"
import path from "node:path"
import { configDefaults, defineConfig } from "vitest/config"
import type { BrowserConfigOptions } from "vitest/node"

import { createSharedPlugins } from "./vite.shared"

const dirname = import.meta.dirname
const LINGUI_MACROS = ["@lingui/core/macro", "@lingui/solid/macro"]
const browser: BrowserConfigOptions = {
	enabled: true,
	headless: true,
	provider: playwright(),
	instances: [{ browser: "chromium" }],
}

export default defineConfig({
	plugins: createSharedPlugins(),
	resolve: {
		tsconfigPaths: true,
	},
	optimizeDeps: {
		exclude: LINGUI_MACROS,
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "node",
					globals: true,
					include: ["./src/**/*.test.{ts,tsx}"],
					exclude: [...configDefaults.exclude, "**/*.browser.test.{ts,tsx}"],
				},
			},
			{
				extends: true,
				plugins: [msw()],
				test: {
					name: "browser",
					setupFiles: ["./src/test/vitest.setup.ts", "./src/test/msw.setup.ts"],
					include: ["./src/**/*.browser.test.{ts,tsx}"],
					browser,
				},
			},
			{
				extends: true,
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
					storybookTest({
						configDir: path.join(dirname, ".storybook"),
					}),
				],
				optimizeDeps: {
					include: [
						"@solid-primitives/memo",
						"@tanstack/solid-devtools",
						"zxcvbn",
					],
				},
				test: {
					name: "storybook",
					setupFiles: ["./src/test/vitest.setup.ts"],
					browser: {
						...browser,
						instances: [{ browser: "chromium", name: "storybook (chromium)" }],
					},
				},
			},
		],
	},
})
