import solid from "vite-plugin-solid"
import { defineConfig } from "vitest/config"
import viteConfigPaths from "vite-tsconfig-paths"
export default defineConfig({
	plugins: [solid(), viteConfigPaths()],
	resolve: {
		conditions: ["development", "browser"],
	},
	test: {
		include: [
			"test/dom/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
	},
})
