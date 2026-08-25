import { defineConfig } from "vite"

import { createSharedPlugins } from "./vite.shared"

export default defineConfig({
	plugins: createSharedPlugins(),
	resolve: {
		tsconfigPaths: true,
	},
	optimizeDeps: {
		include: ["solid-radix-icons"],
	},
	define: {
		"process.env": {},
	},
})
