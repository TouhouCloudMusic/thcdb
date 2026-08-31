import { defineConfig } from "vite"

import { createSharedPlugins } from "./vite.shared"

export default defineConfig({
	plugins: createSharedPlugins(),
	resolve: {
		tsconfigPaths: true,
	},
	define: {
		"process.env": {},
	},
})
