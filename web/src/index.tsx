/* @refresh reload */
import { render } from "solid-js/web"

import App from "./App"
import "./index.css"
import { resolveInitialLocale } from "./state/i18n/init"
import { loadLocale } from "./state/i18n/runtime"

const root = document.querySelector("#root")

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	)
}

const initialLocale = resolveInitialLocale()

await loadLocale(initialLocale)

render(() => <App initialLocale={initialLocale} />, root!)
