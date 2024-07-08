import { getCookie } from "vinxi/http"
import { AppTheme } from "./app_state.tsx"
import Cookie from "js-cookie"

export function getCookieTheme(): AppTheme {
	"use server"
	const themeID = getCookie("app_theme") ?? "0"
	return parseInt(themeID, 10)
}

export function setCookieTheme(theme: AppTheme) {
	Cookie.set("app_theme", String(theme))
}

export function updateTheme(theme: AppTheme) {
	function change(str: string) {
		document.getElementById("app")!.classList.add("notransition")
		document.documentElement.setAttribute("data-mode", str)
		setTimeout(() => {
			document.getElementById("app")!.classList.remove("notransition")
		}, 0)
	}
	switch (theme) {
		case AppTheme.dark:
			change("dark")
			break
		default:
			change("light")
	}
}
