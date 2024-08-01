import * as i18n from "@solid-primitives/i18n"
import { type AppLocale } from "~/state/i18n/index.ts"
import en_dict from "./en.ts"

export type Dict = typeof en_dict
export type FlatDict = i18n.Flatten<Dict>

export async function fetchDictionary(locale: AppLocale) {
	"use server"
	let dict
	switch (locale) {
		case "zh-Hans":
			dict = (await import("./zh-Hans.ts")).default
			break
		default:
			dict = en_dict
	}
	return i18n.flatten(dict)
}
