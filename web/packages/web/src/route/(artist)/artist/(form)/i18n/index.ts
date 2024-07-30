import * as i18n from "@solid-primitives/i18n"
import { cache } from "@solidjs/router"
import en_dict from "./en.ts"

export type Dict = typeof en_dict
export type SupportLocale = "en" | "zh-Hans"
export type FlatDict = i18n.Flatten<Dict>

async function fetchDictionary(locale: SupportLocale) {
	"use server"
	let dict
	if (locale === "zh-Hans") dict = (await import("./zh-Hans.ts")).default
	else dict = en_dict
	return i18n.flatten(dict)
}

export const cacheFetchDictionary = cache(async (locale: SupportLocale) => {
	return await fetchDictionary(locale)
}, "i18n_dict_edit_artist_page")
