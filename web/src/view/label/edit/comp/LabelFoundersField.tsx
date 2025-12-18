import { Field, getErrors, insert, remove } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { SimpleArtist } from "@thc/api"
import { ArtistApi } from "@thc/api"
import { Either, Option as O } from "effect"
import { For, createEffect, createSignal, on } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"

import { useLabelForm } from "../context"

type FounderEntry = {
	id: number
	name: string
}

type Props = {
	class?: string
	initFounderIds?: number[]
}

export function LabelFoundersField(props: Props) {
	const { formStore } = useLabelForm()

	const [founders, setFounders] = createSignal<FounderEntry[]>(
		props.initFounderIds?.map((id) => ({ id, name: `#${id}` })) ?? [],
	)

	const contain = (artist: SimpleArtist) =>
		founders().some((entry) => entry.id === artist.id)

	const addFounder = (artist: SimpleArtist) => {
		if (contain(artist)) return

		insert(formStore, {
			path: ["data", "founders"],
			initialInput: artist.id,
		})
		setFounders((prev) => [...prev, { id: artist.id, name: artist.name }])
	}

	const removeFounderAt = (index: number) => () => {
		remove(formStore, { path: ["data", "founders"], at: index })
		setFounders((prev) => prev.toSpliced(index, 1))
	}

	createEffect(
		on(
			() => props.initFounderIds,
			(ids) => {
				if (!ids || ids.length === 0) {
					setFounders([])
					return
				}

				setFounders(ids.map((id) => ({ id, name: `#${id}` })))

				const fetchFounders = async () => {
					const results = await Promise.all(
						ids.map(async (id) => {
							const result = await ArtistApi.findOne({ path: { id } })
							return Either.match(result, {
								onRight: (option) => O.getOrNull(option),
								onLeft: () => {},
							})
						}),
					)

					setFounders((prev) =>
						prev.map((entry, index) => {
							const artist = results[index]
							if (artist) {
								return { id: artist.id, name: artist.name }
							}
							return entry
						}),
					)
				}
				void fetchFounders()
			},
			{ defer: true },
		),
	)

	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">
					<Trans>Founders</Trans>
				</FormComp.Label>
				<ArtistSearchDialog
					onSelect={addFounder}
					icon={<PlusIcon class="size-4" />}
					dataFilter={(artist) => !contain(artist)}
				/>
			</div>
			<FormComp.ErrorList
				errors={getErrors(formStore, { path: ["data", "founders"] })}
			/>
			<ul class="flex h-full flex-col gap-2">
				<For
					each={founders()}
					fallback={<FieldArrayFallback />}
				>
					{(founder, idx) => (
						<li class="grid grid-cols-[1fr_auto] items-center gap-2">
							<div class="flex flex-col">
								<span class="text-sm font-medium">{founder.name}</span>
								<span class="text-xs text-slate-500">#{founder.id}</span>
							</div>
							<Field
								of={formStore}
								path={["data", "founders", idx()]}
							>
								{(field) => (
									<>
										<input
											{...field.props}
											type="number"
											hidden
											value={field.input}
										/>
										<For each={field.errors}>
											{(error) => (
												<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
											)}
										</For>
									</>
								)}
							</Field>
							<Button
								variant="Tertiary"
								size="Sm"
								onClick={removeFounderAt(idx())}
							>
								<Cross1Icon />
							</Button>
						</li>
					)}
				</For>
			</ul>
		</div>
	)
}
