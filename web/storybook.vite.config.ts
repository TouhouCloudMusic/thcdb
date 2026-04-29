import { defineConfig } from "vite"

import { createAppPlugins } from "./vite.shared"

export default defineConfig({
	plugins: createAppPlugins(),
	resolve: {
		tsconfigPaths: true,
	},
	define: {
		"process.env": {},
	},
})
