import { getCookie } from "vinxi/http"
import { AppLocaleCompiler } from "../i18n"
import { AppTheme } from "../theme"

export function theme() {
	return getCookie("app_theme") === AppTheme.dark.toString() ? "dark" : "light"
}

export function lang() {
	const locale = getCookie("app_locale")
	if (AppLocaleCompiler.Check(locale)) {
		return locale
	} else {
		return "en"
	}
}
