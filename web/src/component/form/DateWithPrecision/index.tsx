import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import { createMemo } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"
import type { DateWithPrecision as TDateWithPrecision } from "~/domain/shared"

import { setDay, setMonth, setYear, storeToValue, valueToStore } from "./state"

export interface DateWithPrecisionProps {
	styles?: StyleXStyles
	value?: Partial<TDateWithPrecision.In>
	setValue(val?: TDateWithPrecision.In): void
}

export function DateWithPrecision(props: DateWithPrecisionProps) {
	const { t } = useLingui()
	const store = createMemo(() => valueToStore(props.value))

	const setYearRaw = (raw: string) =>
		props.setValue(storeToValue(setYear(store(), raw)))

	const setMonthRaw = (raw: string) =>
		props.setValue(storeToValue(setMonth(store(), raw)))

	const setDayRaw = (raw: string) =>
		props.setValue(storeToValue(setDay(store(), raw)))

	return (
		<>
			<InputField.Root
				styles={props.styles}
				value={store().year?.toString() ?? ""}
				onChange={setYearRaw}
			>
				<InputField.Input
					inputMode="numeric"
					maxLength={4}
					pattern="[0-9]*"
					placeholder={t`Year`}
					type="text"
				/>
			</InputField.Root>
			<InputField.Root
				styles={props.styles}
				value={store().month?.toString() ?? ""}
				onChange={setMonthRaw}
			>
				<InputField.Input
					disabled={store().year === undefined}
					inputMode="numeric"
					maxLength={2}
					pattern="[0-9]*"
					placeholder={t`Month`}
					type="text"
				/>
			</InputField.Root>
			<InputField.Root
				styles={props.styles}
				value={store().day?.toString() ?? ""}
				onChange={setDayRaw}
			>
				<InputField.Input
					disabled={store().year === undefined || store().month === undefined}
					inputMode="numeric"
					maxLength={2}
					pattern="[0-9]*"
					placeholder={t`Day`}
					type="text"
				/>
			</InputField.Root>
		</>
	)
}
