import * as i18n from "@solid-primitives/i18n"
import en_dict from "./en"

export type Dict = typeof en_dict
export type SupportLocale = "en" | "zh_hans"
export type FlatDict = ReturnType<typeof i18n.flatten<Dict>>
export async function fetchDictionary(locale: SupportLocale) {
	let dict
	if (locale === "en") dict = en_dict
	else dict = (await import(`./zh_hans.ts`)).default
	return i18n.flatten(dict)
}
