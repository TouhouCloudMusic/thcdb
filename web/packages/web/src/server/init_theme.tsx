import { getCookie } from "vinxi/http"
import { AppTheme } from "../state/app_state.tsx"

export function initSSRTheme() {
	return getCookie("app_theme") === AppTheme.dark.toString() ? "dark" : "light"
}
