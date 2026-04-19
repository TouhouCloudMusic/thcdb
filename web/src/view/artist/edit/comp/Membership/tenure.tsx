/* @refresh reload */
import { Field, FieldArray, getInput, insert, remove } from "@formisch/solid"
import { t } from "@lingui/core/macro"
import { ObjExt } from "@thc/toolkit/data"
import type { JSX } from "solid-js"
import { For } from "solid-js"
import { Cross1Icon } from "solid-radix-icons"

import { FormComp } from "~/component/atomic"
import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"

import { useArtistForm } from "../../context"
import type { ArtistEditFormContextValue } from "../../context"

export function TenureFieldArray(props: { index: number }): JSX.Element {
	const { formStore } = useArtistForm()

	const tenures = {
		add: () => {
			insert(formStore, {
				path: ["data", "memberships", props.index, "tenure"],
				initialInput: {},
			})
		},
		remove: (index: number) => {
			remove(formStore, {
				path: ["data", "memberships", props.index, "tenure"],
				at: index,
			})
		},
	}

	return (
		<div class="row-start-3 space-y-2">
			<div class="flex items-center justify-between">
				<span class="font-light">{t`Tenures`}</span>
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

			<FieldArray
				of={formStore}
				path={["data", "memberships", props.index, "tenure"]}
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
						<For each={fieldArray.errors ?? []}>
							{(error) => (
								<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
							)}
						</For>
					</>
				)}
			</FieldArray>
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

	const errors = () => computeTenureError(formStore, props.membershipIndex)

	return (
		<li class="grid grid-cols-[1fr_auto] items-center p-1.5">
			<div class="flex w-full items-center justify-between gap-2">
				{TYPE.map((kind, idx) => (
					<Field
						of={formStore}
						path={[
							"data",
							"memberships",
							props.membershipIndex,
							"tenure",
							props.entryIndex,
							kind,
						]}
					>
						{(field) => (
							<InputField.Root class="w-32 flex-1">
								<InputField.Input
									{...field.props}
									type="number"
									class="no-spinner"
									placeholder={idx == 0 ? t`Join year` : t`Leave year`}
									value={field.input ?? undefined}
								/>
								<InputField.Error>{field.errors?.[0]}</InputField.Error>
							</InputField.Root>
						)}
					</Field>
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
	formStore: ArtistEditFormContextValue["formStore"],
	index: number,
): string[] {
	const tenuresRaw = getInput(formStore, {
		path: ["data", "memberships", index, "tenure"],
	})

	const tenures = Array.isArray(tenuresRaw) ? tenuresRaw : []

	if (tenures.length === 0) return []

	const res: string[] = []

	for (let i = 0; i < tenures.length; i++) {
		const tenure = tenures[i]
		if (!ObjExt.isRecord(tenure)) continue

		const joinYear = tenure.join_year
		const leaveYear = tenure.leave_year

		if (typeof leaveYear === "number" && typeof joinYear === "number") {
			if (leaveYear < joinYear) {
				res.push(t`Leave year cannot be earlier than join year`)
			} else if (leaveYear === joinYear) {
				res.push(t`Leave year cannot be the same as join year`)
			}
		}

		if (i > 0) {
			const prevTenure = tenures[i - 1]
			if (!ObjExt.isRecord(prevTenure)) continue

			const prevLeave = prevTenure.leave_year

			if (typeof prevLeave === "number" && typeof joinYear === "number") {
				if (joinYear < prevLeave) {
					res.push(
						t({
							message: "Join year cannot be earlier than previous leave year",
						}),
					)
				} else if (joinYear === prevLeave) {
					res.push(
						t({
							message: "Join year cannot be the same as previous leave year",
						}),
					)
				}
			}
		}
	}

	return res
}
