import { I18nProvider as LinguiProvier } from "@lingui-solid/solid"
import { i18n } from "@lingui/core"
import { type } from "arktype"
import type { ParentProps } from "solid-js"
import { createContext } from "solid-js"

import { assertContext } from "~/utils/context"

import { initUserLang } from "./init"

export const AppLocale = type(`"en" | "zh-Hans"`)
export type AppLocale = typeof AppLocale.infer

const I18nContext = createContext<I18nStore>()
export function I18NProvider(props: ParentProps) {
	const lang = initUserLang()

	return (
		<I18nContext.Provider value={I18nStore.new(lang)}>
			<LinguiProvier i18n={i18n}>{props.children}</LinguiProvier>
		</I18nContext.Provider>
	)
}

export class I18nStore {
	constructor(init: AppLocale) {
		this.effect(init)
	}

	public get locale() {
		return i18n.locale
	}

	public static new(lang: AppLocale) {
		return new I18nStore(lang)
	}

	public setLocale(lang: AppLocale) {
		if (this.locale === lang) {
			// void this.startTransition(() => {
			// 	this.#setLocale(newLocale)
			// })
			return
		}
		this.effect(lang)
	}

	effect(lang: AppLocale) {
		void dynamicLoad(lang)
		setDocumentLang(lang)
	}
}

function dynamicLoad(lang: AppLocale) {
	return import(`../../locale/${lang}/messages.ts`).then(({ messages }) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		i18n.load(lang, messages)
		i18n.activate(lang)
	})
}

export function useI18N() {
	return assertContext(I18nContext)
}

function setDocumentLang(locale: AppLocale) {
	document.documentElement.lang = locale
}
