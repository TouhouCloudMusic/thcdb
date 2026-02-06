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
		label: "Artists",
		hint: "Circles & solo creators",
	},
	{
		key: "releases_count",
		label: "Releases",
		hint: "Albums, EPs, singles",
	},
	{
		key: "songs_count",
		label: "Songs",
		hint: "Tracks & arrangements",
	},
	{ key: "tags_count", label: "Tags", hint: "Genres, themes, credits" },
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
		title: "Artists",
		description: "Browse circles and solo creators with filters and sorting.",
		to: "/artist/explore",
		accent: "Reimu",
		meta: "Explore",
	},
	{
		title: "Releases",
		description: "Track albums and compilations, link artists and events.",
		to: "/release/explore",
		accent: "Marisa",
		meta: "Explore",
	},
	{
		title: "Songs",
		description: "Find tracks by title language, credits, and corrections.",
		to: "/song/explore",
		accent: "Blue",
		meta: "Explore",
	},
	{
		title: "Tags",
		description: "Navigate genres, themes and metadata through tag types.",
		to: "/tag/explore",
		accent: "Slate",
		meta: "Explore",
	},
	{
		title: "Events",
		description: "See conventions and live shows where releases debuted.",
		to: "/event/explore",
		accent: "Green",
		meta: "Explore",
	},
	{
		title: "Labels",
		description: "Explore labels, imprint history and founded/dissolved dates.",
		to: "/label/explore",
		accent: "Slate",
		meta: "Explore",
	},
]
