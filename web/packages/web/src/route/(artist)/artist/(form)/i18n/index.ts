import * as i18n from "@solid-primitives/i18n"
import { cache } from "@solidjs/router"
import { useI18N } from "~/state/i18n"
import en_dict from "./en.ts"

export type Dict = typeof en_dict
export type SupportLocale = "en" | "zh-Hans"
// export type FlatDict = i18n.Flatten<Dict>
export type FlatDict = i18n.Flatten<Dict>
export async function fetchDictionary(locale: SupportLocale) {
	let dict
	if (locale === "zh-Hans") dict = (await import("./zh-Hans.ts")).default
	else dict = en_dict
	return i18n.flatten(dict)
}

export const cacheFetchDictionary = cache(async (locale?: SupportLocale) => {
	if (!locale) locale = useI18N().locale()
	return await fetchDictionary(locale)
}, "i18n_dict_edit_artist_page")
