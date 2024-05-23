import { AppTheme } from "../state/app.state"
import { getCookie } from "vinxi/http"

export function initSSRTheme() {
	return getCookie("app_theme") === AppTheme.dark.toString()
		? "dark"
		: "light"
}
