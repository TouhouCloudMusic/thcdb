/* @refresh reload */
// oxlint-disable max-lines-per-function
import { Trans, useLingui } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"
import type { JSX } from "solid-js"
import { For } from "solid-js"
import { Cross1Icon } from "solid-radix-icons"

import { FormComp } from "~/components/atomic"
import { Button } from "~/components/atomic/button"
import { InputField } from "~/components/atomic/form/Input"
import type { NewArtistCorrection } from "~/domain/artist/schema"

import { useArtistForm } from "../../context"

export function TenureFieldArray(props: { index: number }): JSX.Element {
	const { formStore } = useArtistForm()

	let path = () => `data.memberships.${props.index}.tenure` as const

	let tenures = {
		add: () => {
			M.insert(formStore, path(), {
				value: {},
			})
		},
		remove: (index: number) => {
			M.remove(formStore, path(), {
				at: index,
			})
		},
	}

	return (
		<div class="row-start-3 space-y-2">
			<div class="flex items-center justify-between">
				<span class="font-light">
					<Trans>Tenures</Trans>
				</span>
				<Button
					variant="Tertiary"
					size="Sm"
					type="button"
					class="font-light text-primary"
					onClick={tenures.add}
				>
					Add Tenure
				</Button>
			</div>

			<M.FieldArray
				of={formStore}
				name={path()}
			>
				{(fieldArray) => (
					<>
						<ul>
							<For each={fieldArray.items}>
								{(_, idx) => (
									<TenureEntry
										membershipIndex={props.index}
										entryIndex={idx()}
										onRemove={() => tenures.remove(idx())}
									/>
								)}
							</For>
						</ul>
						<FormComp.ErrorMessage>{fieldArray.error}</FormComp.ErrorMessage>
					</>
				)}
			</M.FieldArray>
		</div>
	)
}

const TYPE = ["join_year", "leave_year"] as const

function TenureEntry(props: {
	membershipIndex: number
	entryIndex: number
	onRemove: () => void
}) {
	const { formStore } = useArtistForm()
	const { t } = useLingui()

	let errors = () => computeTenureError(formStore, props.membershipIndex)

	return (
		<li class="grid grid-cols-[1fr_auto] items-center p-1.5">
			<div class="flex w-full items-center justify-between gap-2">
				{TYPE.map((kind, idx) => (
					<M.Field
						of={formStore}
						name={`data.memberships.${props.membershipIndex}.tenure.${props.entryIndex}.${kind}`}
						type="number"
					>
						{(field, fieldProps) => (
							<InputField.Root class="w-32 flex-1">
								<InputField.Input
									{...fieldProps}
									type="number"
									class="no-spinner"
									placeholder={idx == 0 ? t`Join year` : t`Leave year`}
									value={field.value ?? undefined}
								/>
								<InputField.Error>{field.error}</InputField.Error>
							</InputField.Root>
						)}
					</M.Field>
				)).toSpliced(1, 0, <span class="text-secondary">-</span>)}
			</div>

			<Button
				variant="Tertiary"
				size="Sm"
				type="button"
				onClick={props.onRemove}
				class="p-2"
				aria-label={t`Remove tenure entry`}
				title={t`Remove tenure entry`}
			>
				<Cross1Icon />
			</Button>

			<ul>
				<For each={errors()}>
					{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
				</For>
			</ul>
		</li>
	)
}

function computeTenureError(
	formStore: M.FormStore<NewArtistCorrection>,
	index: number,
	// t: (v: TemplateStringsArray) => string,
): string[] {
	const tenures = M.getValues(formStore, `data.memberships.${index}.tenure`, {
		shouldActive: false,
	})
	const { t } = useLingui()

	if (tenures.length === 0) return []

	let res: string[] = []

	for (let i = 0; i < tenures.length; i++) {
		let tenure = tenures[i]
		if (!tenure) continue
		if (tenure.leave_year && tenure.join_year) {
			if (tenure.leave_year < tenure.join_year) {
				res.push(t`Leave year cannot be earlier than join year`)
			} else if (tenure.leave_year === tenure.join_year) {
				res.push(t`Leave year cannot be the same as join year`)
			}
		}

		if (i > 0) {
			let prevTenure = tenures[i - 1]
			if (!prevTenure) continue
			if (prevTenure.leave_year && tenure.join_year) {
				if (tenure.join_year < prevTenure.leave_year) {
					res.push(t`Join year cannot be earlier than previous leave year`)
				} else if (tenure.join_year === prevTenure.leave_year) {
					res.push(t`Join year cannot be the same as previous leave year`)
				}
			}
		}
	}

	return res
}
