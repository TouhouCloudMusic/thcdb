import { Field, getErrors, insert, remove } from "@formisch/solid"
import type { SimpleArtist } from "@thc/api"
import { complement } from "@thc/toolkit"
import { For } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"

import { ArtistInfo } from "./EntityInfo"
import type { ReleaseFormStore } from "./types"

export function ReleaseArtistsField(props: {
	of: ReleaseFormStore
	initArtists?: SimpleArtist[]
	class?: string
}) {
	const [artists, setArtists] = createStore<SimpleArtist[]>([
		...(props.initArtists ?? []),
	])

	const contain = (artist: SimpleArtist) =>
		artists.some((a) => a.id === artist.id)

	const addArtist = (artist: SimpleArtist) => {
		if (contain(artist)) return
		insert(props.of, { path: ["data", "artists"], initialInput: artist.id })
		setArtists(artists.length, { id: artist.id, name: artist.name })
	}

	const removeArtistAt = (idx: number) => () => {
		remove(props.of, { path: ["data", "artists"], at: idx })
		setArtists((list) => list.toSpliced(idx, 1))
	}

	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">Artists</FormComp.Label>
				<div class="flex gap-2">
					<ArtistSearchDialog
						onSelect={addArtist}
						dataFilter={complement(contain)}
						icon={<PlusIcon class="size-4 text-slate-600" />}
					/>
				</div>
			</div>
			<FormComp.ErrorList
				errors={getErrors(props.of, { path: ["data", "artists"] })}
			/>
			<ul class="flex h-full flex-col gap-2">
				<For
					each={artists}
					fallback={<FieldArrayFallback />}
				>
					{(artist, idx) => (
						<li class="grid h-fit grid-cols-[1fr_auto]">
							<ArtistInfo value={{ id: artist.id, name: artist.name }} />

							<Field
								of={props.of}
								path={["data", "artists", idx()]}
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
								onClick={removeArtistAt(idx())}
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
