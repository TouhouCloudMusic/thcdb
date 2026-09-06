import type { Language } from "@thc/api"

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
