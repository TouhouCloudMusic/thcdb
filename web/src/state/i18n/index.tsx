import { type } from "arktype"
import type { ParentProps, Signal } from "solid-js"
import { createContext, createSignal, useTransition } from "solid-js"
import type { Context, Transition } from "solid-js/types/reactive/signal.d.ts"
import { useContextUnsave } from "~/utils/context"

export const AppLocale = type(`"en" | "zh-Hans"`)
export type AppLocale = typeof AppLocale.infer
export const I18nContext =
	createContext<I18nStore>() as unknown as Context<I18nStore>

export function I18NProvider(props: ParentProps) {
	return (
		<>
			<I18nContext.Provider value={I18nStore.default()}>
				{props.children}
			</I18nContext.Provider>
		</>
	)
}

export class I18nStore {
	private locale_signal: Signal<AppLocale>
	private transition: Transition

	constructor(locale: AppLocale) {
		this.locale_signal = createSignal<AppLocale>(locale)
		this.transition = useTransition()

		this.effect()
	}

	public static new(locale: AppLocale) {
		return new I18nStore(locale)
	}

	public static default() {
		return new I18nStore("en")
	}

	public get locale() {
		return this.locale_signal[0]
	}

	public setLocale(newLocale: AppLocale) {
		if (this.locale() === newLocale) return
		void this.transition[1](() => {
			this.locale_signal[1](newLocale)
			this.effect()
		})
	}

	public duringTransition() {
		return this.transition[0]()
	}

	effect() {
		setDocumentLang(this.locale())
	}
}

export function useI18N() {
	return useContextUnsave(I18nContext)
}

function setDocumentLang(locale: AppLocale) {
	document.documentElement.lang = locale
}
