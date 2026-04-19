import { t } from "@lingui/core/macro"
import { createEffect, createMemo, on, untrack } from "solid-js"
import { createStore, produce } from "solid-js/store"

import { InputField } from "~/component/atomic/form/Input"
import type { DateWithPrecision as TDateWithPrecision } from "~/domain/shared"

import type { Store } from "./state"
import { setDay, setMonth, setYear, storeToValue, valueToStore } from "./state"

export interface DateWithPrecisionProps {
	class?: string
	value?: TDateWithPrecision.In
	setValue(val?: TDateWithPrecision.In): void
}

export function DateWithPrecision(props: DateWithPrecisionProps) {
	const [store, setStore] = createStore<Store>(
		untrack(() => valueToStore(props.value)),
	)

	const currentValue = createMemo(() => storeToValue(store))

	const applyStore = (next: Store) => {
		setStore(
			produce((draft) => {
				draft.year = next.year
				draft.month = next.month
				draft.day = next.day
			}),
		)
	}

	const setYearRaw = (raw: string) => applyStore(setYear(store, raw))

	const setMonthRaw = (raw: string) => applyStore(setMonth(store, raw))

	const setDayRaw = (raw: string) => applyStore(setDay(store, raw))

	const applyValue = (next?: TDateWithPrecision.In) =>
		applyStore(valueToStore(next))

	createEffect(
		on(
			() => props.value,
			(next) => applyValue(next),
			{ defer: true },
		),
	)

	createEffect(on(currentValue, (next) => props.setValue(next)))

	return (
		<>
			<InputField.Root class={props.class}>
				<InputField.Input
					inputMode="numeric"
					maxLength={4}
					onInput={(e) => setYearRaw(e.currentTarget.value)}
					pattern="[0-9]*"
					placeholder={t`Year`}
					type="text"
					value={store.year ?? ""}
				/>
			</InputField.Root>
			<InputField.Root class={props.class}>
				<InputField.Input
					disabled={store.year === undefined}
					inputMode="numeric"
					maxLength={2}
					onInput={(e) => setMonthRaw(e.currentTarget.value)}
					pattern="[0-9]*"
					placeholder={t`Month`}
					type="text"
					value={store.month ?? ""}
				/>
			</InputField.Root>
			<InputField.Root class={props.class}>
				<InputField.Input
					disabled={store.year === undefined || store.month === undefined}
					inputMode="numeric"
					maxLength={2}
					onInput={(e) => setDayRaw(e.currentTarget.value)}
					pattern="[0-9]*"
					placeholder={t`Day`}
					type="text"
					value={store.day ?? ""}
				/>
			</InputField.Root>
		</>
	)
}
