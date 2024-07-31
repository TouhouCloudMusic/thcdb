import { isServer } from "solid-js/web"
import { type AppLocale, useI18N } from "~/state/i18n"
import { getLocaleCookie } from "~/state/i18n/provider"

export async function preloadLocale(): Promise<AppLocale> {
	let locale: AppLocale | undefined
	if (!isServer) {
		locale = useI18N().locale()
	} else if (locale === undefined) {
		locale = await getLocaleCookie()
	} else {
		locale = "en"
	}
	return locale
}
