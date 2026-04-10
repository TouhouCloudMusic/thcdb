import { adapter as jsx, createJsxHeuristic } from "@wuchale/jsx"
import { defaultHeuristicOpts, defineConfig } from "wuchale"

const IGNORED_ATTRIBUTE_MESSAGES = new Set(["variant", "color", "size"])
const CORRECTION_KIND_MESSAGES = new Set(["Create", "Update"])
const IMAGE_QUEUE_ACTION_MESSAGES = new Set(["Approve", "Reject", "Revert"])
const IMAGE_QUEUE_STATUS_MESSAGES = new Set([
	"Pending",
	"Approved",
	"Rejected",
	"Cancelled",
	"Reverted",
])
const KEYBOARD_KEY_MESSAGES = new Set([
	"Enter",
	"ArrowLeft",
	"ArrowRight",
	"ArrowUp",
	"ArrowDown",
	"Home",
	"End",
	"Escape",
])
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
const defaultJsxHeuristic = createJsxHeuristic({
	...defaultHeuristicOpts,
	ignoreCalls: [
		...defaultHeuristicOpts.ignoreCalls,
		"ButtonClass_new",
		"imgUrl",
	],
})
type HeuristicMessage = Parameters<typeof defaultJsxHeuristic>[0]

function getSingleText(msg: HeuristicMessage) {
	return msg.msgStr.length === 1 ? msg.msgStr[0] : undefined
}

function isScriptLiteral(msg: HeuristicMessage) {
	return msg.details.scope === "script" && !msg.details.attribute
}

function isIgnoredPath(file: string) {
	return file.startsWith("src/component/atomic/")
}

function isUrlLiteral(text: string) {
	return (
		/https?:\/\/|www\.|@import url\(/i.test(text)
		|| /^(?:[?&])?[a-z0-9_-]+=$/i.test(text)
	)
}

function isCorrectionKindInEditHook(msg: HeuristicMessage, text: string) {
	return (
		/^src\/view\/[^/]+\/edit\/hook\/[^/]+\.(?:ts|tsx)$/.test(msg.details.file)
		&& CORRECTION_KIND_MESSAGES.has(text)
	)
}

function isKeyboardKeyLiteral(msg: HeuristicMessage, text: string) {
	return KEYBOARD_KEY_MESSAGES.has(text) && isScriptLiteral(msg)
}

function isInternalIdentifierLiteral(msg: HeuristicMessage, text: string) {
	return (
		/^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+$/.test(text) && isScriptLiteral(msg)
	)
}

function isImageQueueStatusLiteral(msg: HeuristicMessage, text: string) {
	return (
		/^src\/view\/image_queue\/(?:detail|manage)\.tsx$/.test(msg.details.file)
		&& IMAGE_QUEUE_STATUS_MESSAGES.has(text)
		&& !msg.details.attribute
		&& msg.details.funcName !== "statusTone"
	)
}

function isImageQueueActionLiteral(msg: HeuristicMessage, text: string) {
	return (
		msg.details.file === "src/view/image_queue/detail.tsx"
		&& IMAGE_QUEUE_ACTION_MESSAGES.has(text)
		&& msg.details.call === "handle"
	)
}

function shouldIgnoreSingleText(msg: HeuristicMessage, text: string) {
	return (
		isCorrectionKindInEditHook(msg, text)
		|| isKeyboardKeyLiteral(msg, text)
		|| isInternalIdentifierLiteral(msg, text)
		|| isImageQueueStatusLiteral(msg, text)
		|| isImageQueueActionLiteral(msg, text)
	)
}

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
				const text = getSingleText(msg)

				if (isIgnoredPath(msg.details.file)) {
					return false
				}

				if (text && shouldIgnoreSingleText(msg, text)) {
					return false
				}

				if (text && isUrlLiteral(text)) {
					return false
				}

				if (text && IGNORED_STYLE_ENUM_MESSAGES.has(text)) {
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
