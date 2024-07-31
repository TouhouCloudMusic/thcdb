import * as i18n from "@solid-primitives/i18n"
import en_dict from "./en.ts"

export type Dict = typeof en_dict
export type SupportLocale = "en" | "zh-Hans"
export type FlatDict = i18n.Flatten<Dict>

export async function fetchDictionary(locale: SupportLocale) {
	"use server"
	let dict
	if (locale === "zh-Hans") dict = (await import("./zh-Hans.ts")).default
	else dict = en_dict
	return i18n.flatten(dict)
}
