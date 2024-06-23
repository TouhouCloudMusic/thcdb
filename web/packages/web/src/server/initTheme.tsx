import { getCookie } from "vinxi/http"
import { AppTheme } from "../state/app.state"

export function initSSRTheme() {
	return getCookie("app_theme") === AppTheme.dark.toString() ? "dark" : "light"
}
