import { defineConfig } from "vite"

import { createAppPlugins } from "./vite.shared"

export default defineConfig({
	plugins: createAppPlugins(),
	resolve: {
		tsconfigPaths: true,
	},
	optimizeDeps: {
		include: ["storybook-dark-mode"],
	},
	define: {
		"process.env": {},
	},
})
