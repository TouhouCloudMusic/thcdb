/* @refresh reload */
import { render } from "solid-js/web"
import { loadLocale } from "wuchale/load-utils"

import App from "./App"
import "./index.css"
import * as mainLoader from "./locales/main.loader.js"
import { resolveInitialLocale } from "./state/i18n/init"

const root = document.querySelector("#root")
void mainLoader

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	)
}

const initialLocale = resolveInitialLocale()

await loadLocale(initialLocale)

render(() => <App initialLocale={initialLocale} />, root!)
