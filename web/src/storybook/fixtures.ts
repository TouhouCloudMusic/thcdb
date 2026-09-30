import type { Language, Song } from "@thc/api"

import type { ArtistListItem } from "~/hey-api"

export const TOHOHUM_COVER_URL =
	"https://static.touhoudb.com/img/Album/mainOrig/4599.jpg"
export const DAYBREAK_COVER_URL =
	"https://static.touhoudb.com/img/Album/mainOrig/437.jpg"
export const YABBA_RAGGA_TOHO_3_COVER_URL =
	"https://static.touhoudb.com/img/Album/mainOrig/2522.jpg"

export const ENGLISH_LANGUAGE = {
	id: 2,
	code: "en",
	name: "English",
} as const satisfies Language

export const IOSYS_ARTIST = {
	id: 3,
	name: "IOSYS",
	artist_type: "Multiple",
	profile_image_url: "https://www.iosysos.com/iosys_logo.png",
	current_location: {
		country: "Japan",
		province: "Hokkaido",
		city: "Sapporo",
	},
} satisfies ArtistListItem

export const TOKYO_ACTIVE_NEETS_ARTIST = {
	id: 2,
	name: "東京アクティブNEETs / Tokyo Active NEETs",
	artist_type: "Multiple",
	profile_image_url: "https://www.neets.tokyo/_src/29/all01.jpg",
	current_location: { country: "Japan" },
} satisfies ArtistListItem

export const ZUN_ARTIST = {
	id: 4,
	name: "ZUN",
	artist_type: "Solo",
	profile_image_url:
		"https://upload.wikimedia.org/wikipedia/commons/d/dd/201673_Zun_at_anime_expo_LA.png",
	current_location: {},
} satisfies ArtistListItem

export const ARTIST_IMAGE_CREDITS = `Images: [IOSYS official logo](https://www.iosysos.com/about.html) and [Tokyo Active NEETs official group photo](https://www.neets.tokyo/profile.html).

[ZUN photo by 37419672D](https://commons.wikimedia.org/wiki/File:201673_Zun_at_anime_expo_LA.png), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), displayed with a circular crop.`

export const SONG_INFO_RELATIONS: Song["relations"] = [
	{
		song: {
			id: 100,
			title: "U.N. Owen Was Her?",
			artists: [{ id: 1, name: "ZUN" }],
			release: {
				id: 20,
				title: "Embodiment of Scarlet Devil",
				release_date: { value: "2002-08-11", precision: "Day" },
				cover_art_url: TOHOHUM_COVER_URL,
				track_positions: [{ disc_number: 1, track_number: "09" }],
			},
		},
		direction: "Derived",
		type: "Arrangement",
		description: "Primary melodic source for this arrangement.",
	},
	{
		song: {
			id: 101,
			title: "Locked Girl",
			artists: [{ id: 2, name: "EoSD Sound Team" }],
			release: {
				id: 21,
				title: "Touhou Vocal Collection",
				release_date: { value: "2020-05-01", precision: "Month" },
				cover_art_url: DAYBREAK_COVER_URL,
				track_positions: [
					{ disc_number: 1, track_number: "A2" },
					{ disc_number: 2, track_number: "B1" },
				],
			},
		},
		direction: "Source",
		type: "Remix",
		description: "",
	},
	{
		song: {
			id: 102,
			title: "Shanghai Teahouse ~ Chinese Tea",
			artists: [],
			release: null,
		},
		direction: "Source",
		type: "Cover",
		description: "",
	},
	{
		song: {
			id: 103,
			title: "A Very Long Arrangement Title for Narrow Screens",
			artists: [
				{ id: 3, name: "A Circle With an Unusually Long Name" },
				{ id: 4, name: "Guest Vocalist" },
			],
			release: {
				id: 22,
				title: "A Compilation With an Equally Long Release Title",
				release_date: { value: "2014", precision: "Year" },
				track_positions: [{ disc_number: 3, track_number: null }],
			},
		},
		direction: "Derived",
		type: "Instrumental",
		description:
			"This version combines several motifs from the original song.\nThe second line checks how a longer description wraps inside the card.",
	},
	{
		song: {
			id: 104,
			title: "月まで届け、不死の煙",
			artists: [{ id: 1, name: "ZUN" }],
			release: {
				id: 23,
				title: "Imperishable Night",
				release_date: { value: "2004-08-15", precision: "Day" },
				track_positions: [{ disc_number: 1, track_number: "18" }],
			},
		},
		direction: "Source",
		type: "Medley",
		description: "Melody quoted in the medley.",
	},
	{
		song: {
			id: 105,
			title: "Untitled live recording",
			artists: [{ id: 5, name: "Live Ensemble" }],
			release: {
				id: 25,
				title: "Unreleased Sessions",
				release_date: null,
				track_positions: [],
			},
		},
		direction: "Derived",
		type: "Live",
		description: "",
	},
]
