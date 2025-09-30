import { DateExt } from "@thc/toolkit/data"
import dayjs from "dayjs"
import { createEffect, createMemo, on } from "solid-js"
import { createStore } from "solid-js/store"

import { InputField } from "~/component/atomic/form/Input"
import type {
	DatePrecision,
	DateWithPrecision as TDateWithPrecision,
} from "~/domain/shared"

export interface DateWithPrecisionProps {
	class?: string
	value?: TDateWithPrecision.In
	setValue(val?: TDateWithPrecision.In): void
}

interface Store {
	y?: number
	m?: number
	d?: number
}

const THIS_YEAR = new Date().getFullYear()

function onInput(f: (value?: number) => void) {
	return (
		e: InputEvent & {
			currentTarget: HTMLInputElement
			target: Element
		},
	) => {
		const value = Number.parseInt(e.currentTarget.value, 10)

		f(value)
	}
}

function getPrecision(store: Store) {
	if (store.d) {
		return "Day"
	}
	if (store.m) {
		return "Month"
	}
	if (store.y) {
		return "Year"
	}
	return
}

function valueToStore(value?: TDateWithPrecision.In): Store {
	if (!value) {
		return {}
	}

	const year = value.value.getFullYear()
	const month =
		value.precision === "Year" ? undefined : value.value.getMonth() + 1
	const day = value.precision === "Day" ? value.value.getDate() : undefined

	return { y: year, m: month, d: day }
}

export function DateWithPrecision(props: DateWithPrecisionProps) {
	const [store, setStore] = createStore<Store>(valueToStore(props.value))

	const maxDay = createMemo(() =>
		store.y && store.m
			? dayjs(`${store.y}-${store.m}`).daysInMonth()
			: undefined,
	)

	const setYear = (val?: number) => {
		if (val && val > THIS_YEAR) {
			val = THIS_YEAR
		}
		setStore("y", val)
	}
	const setMonth = (val?: number) => {
		setStore("m", val)
	}
	const setDay = (val?: number) => {
		if (val && val > maxDay()!) {
			val = maxDay()
		}
		setStore("d", val)
	}

	const date = createMemo(() => {
		if (!store.y) return
		const year = store.y
		const month = store.m ?? 1
		const day = store.d ?? 1
		return DateExt.fromYMD(year, month, day)
	})

	const precision = createMemo<DatePrecision | undefined>(() =>
		getPrecision(store),
	)

	createEffect(
		on(
			() => props.value,
			(value) => setStore(valueToStore(value)),
			{ defer: true },
		),
	)

	createEffect(
		on(date, (date) => {
			props.setValue(
				date
					? {
							value: date,
							precision: precision()!,
						}
					: undefined,
			)
		}),
	)

	let klass = createMemo(() => props.class)

	return (
		<>
			<InputField.Root class={klass()}>
				<InputField.Input
					class="no-spinner"
					onInput={onInput(setYear)}
					placeholder="Year"
					type="number"
					value={store.y}
				/>
			</InputField.Root>
			<InputField.Root class={klass()}>
				<InputField.Input
					class="no-spinner"
					disabled={!store.y}
					onInput={onInput(setMonth)}
					placeholder="Month"
					type="number"
					value={store.m}
				/>
			</InputField.Root>
			<InputField.Root class={klass()}>
				<InputField.Input
					class="no-spinner"
					disabled={!store.m}
					onInput={onInput(setDay)}
					placeholder="Day"
					type="number"
					value={store.d}
				/>
			</InputField.Root>
		</>
	)
}
