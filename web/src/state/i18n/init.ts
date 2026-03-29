import type { AppLocale } from "."

export const DEFAULT_LOCALE: AppLocale = "en"
const STORAGE_KEY = "userLang"

export function persistLocalePreference(locale: AppLocale) {
	globalThis.localStorage.setItem(STORAGE_KEY, locale)
}

export function resolveInitialLocale(): AppLocale {
	const savedLocale = readSavedLocale()
	if (savedLocale !== undefined) {
		return savedLocale
	}

	const detectedLocale = resolveBrowserLocale(
		globalThis.navigator.languages,
		globalThis.navigator.language,
	)
	persistLocalePreference(detectedLocale)

	return detectedLocale
}

export function resolveBrowserLocale(
	languages: readonly string[],
	fallbackLanguage: string | undefined,
): AppLocale {
	for (const language of languages) {
		const matchedLocale = matchLocale(language)
		if (matchedLocale !== undefined) {
			return matchedLocale
		}
	}

	const fallbackLocale =
		fallbackLanguage === undefined ? undefined : matchLocale(fallbackLanguage)

	return fallbackLocale ?? DEFAULT_LOCALE
}

export function matchLocale(language: string): AppLocale | undefined {
	if (language.startsWith("en")) {
		return "en"
	}
	if (language.startsWith("zh")) {
		return "zh-Hans"
	}
}

function readSavedLocale(): AppLocale | undefined {
	const savedLocale = globalThis.localStorage.getItem(STORAGE_KEY)
	if (savedLocale !== null && isAppLocale(savedLocale)) {
		return savedLocale
	}
}

function isAppLocale(locale: string): locale is AppLocale {
	return locale === "en" || locale === "zh-Hans"
}
