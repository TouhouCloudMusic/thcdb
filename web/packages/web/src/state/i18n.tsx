import { Type, type Static } from "@sinclair/typebox"
import { TypeCompiler } from "@sinclair/typebox/compiler"
import { createAsync } from "@solidjs/router"
import Cookie from "js-cookie"
import {
	createContext,
	createSignal,
	JSXElement,
	Show,
	useTransition,
} from "solid-js"
import { getCookie, setCookie } from "vinxi/http"
import { useContextUnsave } from "~/lib/context/use_context_unsave"

const appLocale = Type.Union([Type.Literal("en"), Type.Literal("zh-Hans")])
const appLocaleCompiler = TypeCompiler.Compile(appLocale)
export type AppLocale = Static<typeof appLocale>

function getLocaleCookie(): AppLocale {
	"use server"
	const locale = getCookie("app_locale")
	if (appLocaleCompiler.Check(locale)) {
		return locale
	} else {
		setCookie("app_locale", "en")
		return "en"
	}
}

function setLocaleCookie(locale: AppLocale) {
	Cookie.set("app_locale", locale)
}

function setDocumentLang(locale: AppLocale) {
	document.documentElement.lang = locale
}

function I18NController(init: AppLocale) {
	const [locale, setLocale] = createSignal<AppLocale>(init)
	const [duringTransition, startTransition] = useTransition()
	return {
		locale,
		setLocale: (newLocale: AppLocale) => {
			if (locale() === newLocale) return
			void startTransition(() => {
				setLocale(newLocale)
				setLocaleCookie(newLocale)
				setDocumentLang(newLocale)
			})
		},
		duringTransition,
	}
}

const I18NContext = createContext<ReturnType<typeof I18NController>>()
export function useI18N() {
	return useContextUnsave(I18NContext)
}

export function I18NProvider(props: { children: JSXElement }) {
	// eslint-disable-next-line @typescript-eslint/require-await
	const cookie = createAsync(async () => getLocaleCookie())
	return (
		<Show when={cookie()}>
			<I18NContext.Provider value={I18NController(cookie()!)}>
				{props.children}
			</I18NContext.Provider>
		</Show>
	)
}

export const I18NTranstionStyle = {
	transition: "color .3s",
	"transition-delay": ".1s",
	"transition-timing-function": "ease-in",
}
