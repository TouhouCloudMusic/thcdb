export type HomeAccent = "Reimu" | "Marisa" | "Blue" | "Green" | "Slate"

export type HomeMetricKey =
	| "artists_count"
	| "releases_count"
	| "songs_count"
	| "tags_count"

export type HomeMetric = {
	key: HomeMetricKey
}

export const HOME_METRICS: HomeMetric[] = [
	{
		key: "artists_count",
	},
	{
		key: "releases_count",
	},
	{
		key: "songs_count",
	},
	{
		key: "tags_count",
	},
]

export type HomeNavItem = {
	to:
		| "/artist/explore"
		| "/release/explore"
		| "/song/explore"
		| "/tag/explore"
		| "/event/explore"
		| "/label/explore"
	accent: HomeAccent
}

export const HOME_NAV_ITEMS: HomeNavItem[] = [
	{
		to: "/artist/explore",
		accent: "Reimu",
	},
	{
		to: "/release/explore",
		accent: "Marisa",
	},
	{
		to: "/song/explore",
		accent: "Blue",
	},
	{
		to: "/tag/explore",
		accent: "Slate",
	},
	{
		to: "/event/explore",
		accent: "Green",
	},
	{
		to: "/label/explore",
		accent: "Slate",
	},
]
