import { getCookie } from "vinxi/http"
import { AppTheme } from "./app_state.tsx"
import Cookie from "js-cookie"
import dayjs from "dayjs"

export function updateTheme(theme: AppTheme) {
	switch (theme) {
		case AppTheme.dark:
			setDoucmentTheme("dark")
			break
		default:
			setDoucmentTheme("light")
	}
}

export function getThemeCookie(): string {
	"use server"
	const themeID = getCookie("app_theme") ?? "0"
	return themeID
}

export function setThemeCookie(theme: AppTheme) {
	Cookie.set("app_theme", String(theme), {
		expires: dayjs().add(30, "days").toDate(),
	})
}

function setDoucmentTheme(str: string) {
	document.getElementById("app")!.classList.add("notransition")
	document.documentElement.setAttribute("data-mode", str)
	setTimeout(() => {
		document.getElementById("app")!.classList.remove("notransition")
	}, 0)
}
