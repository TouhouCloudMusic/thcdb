import { type } from "arktype"
import type { ParentProps } from "solid-js"
import { createContext, createSignal } from "solid-js"

import { assertContext } from "~/utils/solid/assertContext"

import { initUserLang } from "./init"

export const AppLocale = type(`"en" | "zh-Hans"`)
export type AppLocale = typeof AppLocale.infer

type I18nStore = {
	locale: () => AppLocale
	setLocale: (lang: AppLocale) => void
}

const I18nContext = createContext<I18nStore>()
export function I18NProvider(props: ParentProps) {
	const lang = initUserLang()
	const [locale, setLocale] = createSignal<AppLocale>(lang)

	const setLocaleValue = (next: AppLocale) => {
		if (locale() === next) return
		setLocale(next)
		setDocumentLang(next)
	}

	setDocumentLang(lang)

	return (
		<I18nContext.Provider
			value={{
				locale,
				setLocale: setLocaleValue,
			}}
		>
			{props.children}
		</I18nContext.Provider>
	)
}

export function useI18N() {
	return assertContext(I18nContext)
}

function setDocumentLang(locale: AppLocale) {
	document.documentElement.lang = locale
}
