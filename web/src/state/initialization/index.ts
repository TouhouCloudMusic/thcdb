import { getCookie } from "vinxi/http"

import { AppLang } from "../i18n"
import { AppTheme } from "../theme"

export function theme() {
	return getCookie("app_theme") === AppTheme.Dark.toString() ? "dark" : "light"
}

export function lang() {
	const locale = getCookie("app_locale")
	if (AppLang.allows(locale)) {
		return locale
	} else {
		return "en"
	}
}
