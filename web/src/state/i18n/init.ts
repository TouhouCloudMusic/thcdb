import { AppLocale } from "."

const DEFAULT_LANG: AppLocale = "en"
const STORAGE_KEY = "userLang"

export function initUserLang(): AppLocale {
	const saved = localStorage.getItem(STORAGE_KEY) as AppLocale | null
	if (AppLocale.allows(saved)) {
		return saved
	}

	if (navigator.languages.length > 0) {
		for (const lang of navigator.languages) {
			const match = findBestMatch(lang)
			localStorage.setItem(STORAGE_KEY, match)
		}
	}

	if (navigator.language) {
		const match = findBestMatch(navigator.language)
		localStorage.setItem(STORAGE_KEY, match)
	}

	localStorage.setItem(STORAGE_KEY, DEFAULT_LANG)
	return DEFAULT_LANG
}

function findBestMatch(lang: string) {
	if (lang.startsWith("en")) {
		return "en"
	}
	if (lang.startsWith("zh")) {
		return "zh-Hans"
	}

	return "en"
}
