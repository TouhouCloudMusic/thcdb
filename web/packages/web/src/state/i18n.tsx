import { Type, type Static } from "@sinclair/typebox"
import { TypeCompiler } from "@sinclair/typebox/compiler"
import Cookie from "js-cookie"
import {
	createContext,
	createSignal,
	JSXElement,
	onMount,
	useTransition
} from "solid-js"
import { getCookie } from "vinxi/http"
import { useContextUnsave } from "~/lib/context/use_context_unsave"

const appLocale = Type.Union([Type.Literal("en"), Type.Literal("zh_hans")])
const appLocaleCompiler = TypeCompiler.Compile(appLocale)
export type AppLocale = Static<typeof appLocale>

function getLocaleCookie(): AppLocale | null {
	"use server"
	const locale = getCookie("app_locale")
	if (appLocaleCompiler.Check(locale)) {
		return locale
	} else return null
}

function setLocaleCookie(locale: AppLocale) {
	Cookie.set("app_locale", locale)
}

function I18NController(init: AppLocale) {
	const [locale, setLocale] = createSignal<AppLocale>(init)
	const [duringTransition, startTransition] = useTransition()
	return {
		locale,
		setLocale: (newLocale: AppLocale) => {
			if (locale() === newLocale) return
			return startTransition(() => {
				setLocale(newLocale)
				setLocaleCookie(newLocale)
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
	const cookie = getLocaleCookie()
	onMount(() => {
		if (!cookie) {
			setLocaleCookie("en")
		}
	})
	return (
		<I18NContext.Provider value={I18NController(cookie ?? "en")}>
			{props.children}
		</I18NContext.Provider>
	)
}

export const I18NTranstionStyle = {
	transition: "color .3s",
	"transition-delay": ".1s",
	"transition-timing-function": "ease-in",
}
