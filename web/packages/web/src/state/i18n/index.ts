import { Type, type Static } from "@sinclair/typebox"
import { TypeCompiler } from "@sinclair/typebox/compiler"
import dayjs from "dayjs"
import Cookie from "js-cookie"
import type { Signal } from "solid-js"
import { createContext, createSignal, useTransition } from "solid-js"
import { type Transition } from "solid-js/types/reactive/signal.d.ts"
import { useContextUnsave } from "~/lib/context/use_context_unsave"

const APP_LOCALE = Type.Union([Type.Literal("en"), Type.Literal("zh-Hans")])
export const AppLocaleCompiler = TypeCompiler.Compile(APP_LOCALE)
export type AppLocale = Static<typeof APP_LOCALE>

function setLocaleCookie(locale: AppLocale) {
	Cookie.set("app_locale", locale, {
		expires: dayjs().add(30, "days").toDate(),
	})
}

function setDocumentLang(locale: AppLocale) {
	document.documentElement.lang = locale
}

export class I18NController {
	private localeSignal: Signal<AppLocale>
	private transition: Transition

	constructor(locale: AppLocale) {
		setDocumentLang(locale)
		setLocaleCookie(locale)
		this.localeSignal = createSignal<AppLocale>(locale)
		this.transition = useTransition()
	}

	public locale() {
		return this.localeSignal[0]()
	}

	public setLocale(newLocale: AppLocale) {
		if (this.locale() === newLocale) return
		void this.transition[1](() => {
			this.localeSignal[1](newLocale)
			setLocaleCookie(newLocale)
			setDocumentLang(newLocale)
		})
	}

	public duringTransition() {
		return this.transition[0]()
	}
}

export const I18NContext = createContext<I18NController>()
export function useI18N() {
	return useContextUnsave(I18NContext)
}

export const I18NTranstionStyle = {
	transition: "color .3s",
	"transition-delay": ".1s",
	"transition-timing-function": "ease-in",
}
