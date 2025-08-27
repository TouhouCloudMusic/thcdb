import dayjs from "dayjs"
import { createEffect, createMemo, on } from "solid-js"
import { createStore } from "solid-js/store"

import { FormComp } from "~/components/atomic/form"
import { InputField } from "~/components/atomic/form/Input"
import type {
	DatePrecision,
	DateWithPrecision as TDateWithPrecision,
} from "~/domain/shared"

export interface DateWithPrecisionProps {
	label: string
	setValue(val?: TDateWithPrecision.In): void
	error: string | undefined
}

interface Store {
	y?: number
	m?: number
	d?: number
}

const THIS_YEAR = new Date().getFullYear()

const onChange =
	(f: (value?: number) => void) =>
	(
		e: Event & {
			currentTarget: HTMLInputElement
			target: HTMLInputElement
		},
	) => {
		const value = Number.parseInt(e.target.value, 10)

		f(value)
	}

// oxlint-disable-next-line max-lines-per-function
export function DateWithPrecision(props: DateWithPrecisionProps) {
	const [store, setStore] = createStore<Store>({})

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

	const date = createMemo(() =>
		store.y ? new Date(store.y, (store.m ?? 1) - 1, store.d) : undefined,
	)

	const precision = createMemo<DatePrecision | undefined>(() => {
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
	})

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

	return (
		<div>
			<FormComp.Label>{props.label}</FormComp.Label>
			<div class="flex gap-4">
				<InputField.Root>
					<InputField.Input
						class="no-spinner"
						onChange={onChange(setYear)}
						placeholder="Year"
						type="number"
						value={store.y}
					/>
				</InputField.Root>
				<InputField.Root>
					<InputField.Input
						class="no-spinner"
						disabled={!store.y}
						onChange={onChange(setMonth)}
						placeholder="Month"
						type="number"
						value={store.m}
					/>
				</InputField.Root>
				<InputField.Root>
					<InputField.Input
						class="no-spinner"
						disabled={!store.m}
						onChange={onChange(setDay)}
						placeholder="Day"
						type="number"
						value={store.d}
					/>
				</InputField.Root>
			</div>
			<FormComp.ErrorMessage>{props.error}</FormComp.ErrorMessage>
		</div>
	)
}
