import { getCookie } from "vinxi/http"
import { AppTheme } from "./app.state"

export function readLocalTheme() {
	const localTheme = document.documentElement.getAttribute("data-mode")
	const themeID = localTheme === "dark" ? AppTheme.dark : AppTheme.light
	return themeID
}

export function getCookieTheme(): AppTheme {
	"use server"
	const themeID = getCookie("app_theme") ?? "0"
	return parseInt(themeID, 10)
}

/** @deprecated */
export function storageTheme(theme: AppTheme) {
	localStorage.setItem("app_theme", theme.toString())
}

export function setCookieTheme(theme: AppTheme) {
	document.cookie = `app_theme=${theme}`
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
