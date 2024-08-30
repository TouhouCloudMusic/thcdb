import { isServer } from "solid-js/web"
import { type AppLocale, useI18N } from "~/state/i18n"
import { getLocaleCookie } from "~/state/i18n/provider"

export async function preloadLocale(): Promise<AppLocale> {
	if (!isServer) {
		return useI18N().locale()
	} else {
		return await getLocaleCookie()
	}
}
