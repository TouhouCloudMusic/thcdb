import { adapter as jsx } from "@wuchale/jsx"
import { defineConfig } from "wuchale"

export default defineConfig({
	locales: ["en", "zh-Hans"],
	adapters: {
		main: jsx({
			files: {
				ignore: [
					"**/*.gen.ts",
					"**/*.test.ts",
					"**/*.test.tsx",
					"**/*.stories.ts",
					"**/*.stories.tsx",
					"src/hey-api/**",
					"src/locales/.wuchale/**",
					"src/locales/*.loader.js",
				],
			},
			loader: "solidjs",
			variant: "solidjs",
		}),
	},
})
