import { createAsync } from "@solidjs/router"
import { Show, type ParentProps } from "solid-js"
import { getCookie } from "vinxi/http"
import { AppLocale, I18NContext, I18NController } from "."

// eslint-disable-next-line @typescript-eslint/require-await
export async function getLocaleCookie(): Promise<"en" | "zh-Hans"> {
	"use server"
	const locale = getCookie("app_locale")
	if (AppLocale.allows(locale)) {
		return locale
	} else {
		return "en"
	}
}

export function I18NProvider(props: ParentProps) {
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
