import { adapter as jsx, createJsxHeuristic } from "@wuchale/jsx"
import { defaultHeuristicOpts, defineConfig } from "wuchale"

const IGNORED_ATTRIBUTE_MESSAGES = new Set(["variant", "color", "size"])
const IGNORE_PATH_PREXIES = ["src/component/atomic/"]
const IGNORED_STYLE_ENUM_MESSAGES = new Set([
	"Primary",
	"Secondary",
	"Tertiary",
	"PrimaryV2",
	"SecondaryV2",
	"Gray",
	"Slate",
	"Blue",
	"Reimu",
	"Marisa",
	"Green",
	"Xs",
	"Sm",
	"Md",
	"Lg",
])
const jsxHeuristicOpts = {
	...defaultHeuristicOpts,
	ignoreCalls: [...defaultHeuristicOpts.ignoreCalls, "ButtonClass_new"],
}
const defaultJsxHeuristic = createJsxHeuristic(jsxHeuristicOpts)

export default defineConfig({
	locales: ["en", "zh-CN"],
	adapters: {
		main: jsx({
			files: {
				include: ["src/**/*.ts", "src/**/*.tsx"],
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
			heuristic: (msg) => {
				if (
					IGNORE_PATH_PREXIES.some((path) => msg.details.file.startsWith(path))
				) {
					return false
				}

				if (
					msg.msgStr.length === 1
					&& IGNORED_STYLE_ENUM_MESSAGES.has(msg.msgStr[0]!)
				) {
					return false
				}

				if (
					msg.details.attribute
					&& IGNORED_ATTRIBUTE_MESSAGES.has(msg.details.attribute)
				) {
					return false
				}

				return defaultJsxHeuristic(msg)
			},
			loader: "solidjs",
			variant: "solidjs",
		}),
	},
})
