import { adapter as jsx } from "@wuchale/jsx"
import { defineConfig } from "wuchale"

export default defineConfig({
	locales: ["en", "zh-Hans"],
	adapters: {
		main: jsx({
			files: {
				ignore: ["**/*.test.ts", "**/*.test.tsx"],
			},
			loader: "solidjs",
			variant: "solidjs",
		}),
	},
})
