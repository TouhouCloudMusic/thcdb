import type { Event, Release, Tag } from "@thc/api"

import { createMockEvents } from "~/mock/event"
import { createMockReleases } from "~/mock/release"
import { createMockTags } from "~/mock/tag"

export type HomeAccent = "Reimu" | "Marisa" | "Blue" | "Green" | "Slate"

export type HomeMetric = {
	label: string
	value: string
	hint: string
}

export const HOME_METRICS: HomeMetric[] = [
	{ label: "Artists", value: "12,347", hint: "Circles & solo creators" },
	{ label: "Releases", value: "4,892", hint: "Albums, EPs, singles" },
	{ label: "Songs", value: "98,201", hint: "Tracks & arrangements" },
	{ label: "Tags", value: "2,174", hint: "Genres, themes, credits" },
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

export const HOME_FEATURED_RELEASES: Release[] = createMockReleases(6, 101)
export const HOME_TRENDING_TAGS: Tag[] = createMockTags(18, 21)
export const HOME_UPCOMING_EVENTS: Event[] = createMockEvents(4, 41)
