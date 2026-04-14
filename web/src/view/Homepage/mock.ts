import { t } from "@lingui/core/macro"

export type HomeAccent = "Reimu" | "Marisa" | "Blue" | "Green" | "Slate"

export type HomeMetricKey =
	| "artists_count"
	| "releases_count"
	| "songs_count"
	| "tags_count"

export type HomeMetric = {
	key: HomeMetricKey
	label: string
	hint: string
}

export const HOME_METRICS: HomeMetric[] = [
	{
		key: "artists_count",
		get label() {
			return t`Artists`
		},
		get hint() {
			return t`Circles & solo creators`
		},
	},
	{
		key: "releases_count",
		get label() {
			return t`Releases`
		},
		get hint() {
			return t`Albums, EPs, singles`
		},
	},
	{
		key: "songs_count",
		get label() {
			return t`Songs`
		},
		get hint() {
			return t`Tracks & arrangements`
		},
	},
	{
		key: "tags_count",
		get label() {
			return t`Tags`
		},
		get hint() {
			return t`Genres, themes, credits`
		},
	},
]

export type HomeNavItem = {
	title: string
	description: string
	to:
		| "/artist/explore"
		| "/release/explore"
		| "/song/explore"
		| "/tag/explore"
		| "/event/explore"
		| "/label/explore"
	accent: HomeAccent
	meta: string
}

export const HOME_NAV_ITEMS: HomeNavItem[] = [
	{
		title: t`Artists`,
		description: t`Browse circles and solo creators with filters and sorting.`,
		to: "/artist/explore",
		accent: "Reimu",
		meta: t`Explore`,
	},
	{
		title: t`Releases`,
		description: t`Track albums and compilations, link artists and events.`,
		to: "/release/explore",
		accent: "Marisa",
		meta: t`Explore`,
	},
	{
		title: t`Songs`,
		description: t`Find tracks by title language, credits, and corrections.`,
		to: "/song/explore",
		accent: "Blue",
		meta: t`Explore`,
	},
	{
		title: t`Tags`,
		description: t`Navigate genres, themes and metadata through tag types.`,
		to: "/tag/explore",
		accent: "Slate",
		meta: t`Explore`,
	},
	{
		title: t`Events`,
		description: t`See conventions and live shows where releases debuted.`,
		to: "/event/explore",
		accent: "Green",
		meta: t`Explore`,
	},
	{
		title: t`Labels`,
		description: t`Explore labels, imprint history and founded/dissolved dates.`,
		to: "/label/explore",
		accent: "Slate",
		meta: t`Explore`,
	},
]
