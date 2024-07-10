import * as i18n from "@solid-primitives/i18n"
import en_dict from "./en"

export type Dict = typeof en_dict
export type SupportLocale = "en" | "zh_hans"
export type FlatDict = ReturnType<typeof i18n.flatten<Dict>>
export async function fetchDictionary(locale: SupportLocale) {
	let dict
	if (locale === "zh_hans") dict = (await import("./zh_hans")).default
	else dict = en_dict
	return i18n.flatten(dict)
}
