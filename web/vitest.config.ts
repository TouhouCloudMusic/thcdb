import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import path from "node:path"
import { defineConfig } from "vitest/config"

import { createSharedPlugins } from "./vite.shared"

const dirname = import.meta.dirname
const LINGUI_MACROS = ["@lingui/core/macro", "@lingui/solid/macro"]

export default defineConfig({
	plugins: createSharedPlugins(),
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		setupFiles: ["./src/test/vitest.setup.ts"],
		projects: [
			{
				extends: true,
				optimizeDeps: {
					entries: ["src/**/*.test.{ts,tsx}"],
					exclude: LINGUI_MACROS,
				},
				test: {
					name: "unit",
					globals: true,
					include: ["./src/**/*.test.{ts,tsx}"],
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
					entries: [".storybook/preview.tsx", "src/**/*.stories.{ts,tsx}"],
					exclude: LINGUI_MACROS,
					include: [
						"@solid-primitives/memo",
						"@tanstack/solid-devtools",
						"zxcvbn",
					],
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
				},
			},
		],
	},
})
