import { createAsync } from "@solidjs/router"
import { JSXElement, Show } from "solid-js"
import { getCookie } from "vinxi/http"
import { AppLocale, appLocaleCompiler, I18NContext, I18NController } from "."

function getLocaleCookie(): AppLocale {
	"use server"
	const locale = getCookie("app_locale")
	if (appLocaleCompiler.Check(locale)) {
		return locale
	} else {
		return "en"
	}
}

export function I18NProvider(props: { children: JSXElement }) {
	// eslint-disable-next-line @typescript-eslint/require-await
	const cookie = createAsync(async () => getLocaleCookie())
	return (
		<Show when={cookie()}>
			{(cookie) => (
				<I18NContext.Provider value={new I18NController(cookie())}>
					{props.children}
				</I18NContext.Provider>
			)}
		</Show>
	)
}
