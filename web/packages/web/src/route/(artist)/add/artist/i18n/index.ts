import * as i18n from "@solid-primitives/i18n"
import en_dict from "./en"

export type Dict = typeof en_dict
export type Locale = "en" | "zh_hans"
export type FlatDict = ReturnType<typeof i18n.flatten<Dict>>
// export interface FlatDict extends B {}
export async function fetchDictionary(locale: Locale): Promise<FlatDict> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const dict = (await import(`./i18n/${locale}.ts`)).default as Dict
	return i18n.flatten({
		...en_dict,
		...dict,
	}) as FlatDict
}
