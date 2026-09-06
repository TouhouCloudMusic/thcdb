import type { Language } from "@thc/api"

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
