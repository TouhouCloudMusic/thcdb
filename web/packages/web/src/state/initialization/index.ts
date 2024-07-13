import { getCookie } from "vinxi/http"
import { AppTheme } from "../app_state"
import { AppLocaleCompiler } from "../i18n"

export function theme() {
	return getCookie("app_theme") === AppTheme.dark.toString() ? "dark" : "light"
}

export function lang() {
	const lang = getCookie("app_lang")
	if (AppLocaleCompiler.Check(lang)) {
		return lang
	} else {
		return "en"
	}
}
