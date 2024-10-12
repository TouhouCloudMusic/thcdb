import { getError, setValue } from "@modular-forms/solid"
import dayjs from "dayjs"
import { list } from "radash"
import {
	batch,
	createEffect,
	createMemo,
	createSignal,
	For,
	Index,
	type JSX,
	Show,
} from "solid-js"
import { ErrorMessage, Label } from "~/component/form"
import { Select } from "~/component/form/Select/index.tsx"
import { CURRENT_YEAR } from "~/lib/global_constant.ts"
import { useController } from "../context.tsx"

export function DateField() {
	const { artistType, formStore } = useController()

	const startDateLabel = () => {
		const formedDate = "Formed Date"
		const birthDate = "Birth Date"
		return (
			artistType.isNone ? `${formedDate} / ${birthDate}`
			: artistType.isGroup ? formedDate
			: birthDate
		)
	}

	const startDateFieldName = () =>
		artistType.isNone ? "please_select_artist_type"
		: artistType.isGroup ? "formed_date"
		: "birth_date"

	const endDateLabel = () => {
		const disbandedDate = "Disbanded Date"
		const deathDate = "Death Date"
		return (
			artistType.isNone ? `${disbandedDate} / ${deathDate}`
			: artistType.isGroup ? disbandedDate
			: deathDate
		)
	}

	const endDateFieldName = () =>
		artistType.isNone ? "please_select_artist_type"
		: artistType.isGroup ? "disbanded_date"
		: "death_date"

	const subField = [
		{
			label: startDateLabel,
			name: startDateFieldName,
			fieldName: "date_of_start",
		},
		{
			label: endDateLabel,
			name: endDateFieldName,
			fieldName: "date_of_end",
		},
	] as const

	return (
		<section class="flex flex-col gap-y-6">
			{/* <h2 class={`${Legend.className} mb-8`}>
				<Show
					when={artistType.isNone}
					fallback={
						<>
							{startDateLabel()} / {endDateLabel()}
						</>
					}>
					Please Select Artist Type
				</Show>
			</h2> */}
			<For each={subField}>
				{(fieldSet) => {
					const [year, setYear] = createSignal<number>()
					const [month, setMonth] = createSignal<number>()
					const [day, setDay] = createSignal<number>()

					const daysInMonth = createMemo(() =>
						year() && month() ?
							list(1, dayjs(`${year()}-${month()}`).daysInMonth())
						:	[]
					)

					const dateMask = createMemo<DateMask | undefined>(() =>
						day() ? "YMD"
						: month() ? "YM"
						: year() ? "Y"
						: undefined
					)

					createEffect(
						on([year, month, day], () => {
							if (!month()) {
								setDay()
								return
							}

							if (year()) {
								setValue(
									formStore,
									fieldSet.fieldName,
									new Date(year()!, month() ? month()! - 0 : 0, day() ?? 0)
								)
							} else {
								setMonth()
								setDay()
								setValue(formStore, fieldSet.fieldName, null)
							}
						})
					)

					createEffect(() => {
						setValue(formStore, `${fieldSet.fieldName}_mask`, dateMask())
					})

					const parseInput = (
						setFn: Setter<number | undefined>
					): JSX.ChangeEventHandler<HTMLSelectElement, Event> => {
						return (e) =>
							setFn(e.target.value === "" ? undefined : Number(e.target.value))
					}

					const selectClassName = twMerge(
						TextField.InputContainer.className,
						TextField.Input.className
					)

					const fieldError = createMemo(() =>
						getError(formStore, fieldSet.fieldName, {
							shouldActive: false,
						})
					)

					return (
						<fieldset
							name={fieldSet.name()}
							class="grid grid-cols-3 gap-x-4 font-[Inter] [&_label]:row-start-1 [&_label]:text-sm [&_label]:text-slate-800 [&_select]:mt-2">
							<legend class={`${Label.className} mb-4`}>
								{fieldSet.label()}
							</legend>

							<label for={`${fieldSet.name()}_year`}>Year</label>
							<select
								name={`${fieldSet.name()}_year`}
								class={selectClassName}
								disabled={artistType.isNone}
								onChange={parseInput(setYear)}>
								<option></option>
								<Index each={list(1800, CURRENT_YEAR).reverse()}>
									{(year) => <option value={year()}>{year()}</option>}
								</Index>
							</select>

							<label>Month</label>
							<select
								disabled={!year()}
								name={`${fieldSet.name()}_month`}
								class={selectClassName}
								onChange={parseInput(setMonth)}>
								<option onSelect={() => setMonth()}></option>

								<Show when={year()}>
									<Index each={list(1, 12)}>
										{(month) => <option value={month()}>{month()}</option>}
									</Index>
								</Show>
							</select>

							<label for={`${fieldSet.name()}_day`}>Day</label>
							<select
								value={day()}
								class={selectClassName}
								onChange={parseInput(setDay)}
								name={`${fieldSet.name()}_day`}
								disabled={daysInMonth().length === 0}>
								<option onSelect={() => setDay()}></option>

								<Show when={month()}>
									<Index each={daysInMonth()}>
										{(day) => <option value={day()}>{day()}</option>}
									</Index>
								</Show>
							</select>

							<Show when={fieldError()?.length}>
								<span
									class={`${ErrorMessage.className} col-span-full mt-4 max-w-xl`}>
									{fieldError()}
								</span>
							</Show>
						</fieldset>
					)
				}}
			</For>
		</section>
	)
}
