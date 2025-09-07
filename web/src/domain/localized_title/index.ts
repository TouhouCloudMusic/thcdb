import type { LocalizedTitle } from "@thc/api"

import type { nil } from "~/type"

/**
 * Get the preferred localized title from an array of localized titles.
 * Currently defaults to English if available, otherwise returns the first available title.
 */
export function getPreferredLocalizedTitle(
	localizedTitles: LocalizedTitle[] | nil,
	preferredLanguages: string[] = ["en"],
): LocalizedTitle | undefined {
	if (!localizedTitles || localizedTitles.length === 0) {
		return
	}

	// Try to find title in order of preference
	for (const languageCode of preferredLanguages) {
		const found = localizedTitles.find(
			(title) => title.language.code === languageCode,
		)
		if (found) {
			return found
		}
	}

	// If no preferred language found, return the first available
	return localizedTitles[0]
}
