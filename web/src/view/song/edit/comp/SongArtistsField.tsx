import { Field, getErrors, insert, remove } from "@formisch/solid"
import type { SimpleArtist } from "@thc/api"
import { For } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"

import type { SongFormStore } from "./types"

export function SongArtistsField(props: {
	of: SongFormStore
	initArtists?: SimpleArtist[]
	class?: string
}) {
	const [artists, setArtists] = createStore<SimpleArtist[]>([
		...(props.initArtists ?? []),
	])

	const contain = (artist: SimpleArtist) =>
		artists.some((entry) => entry.id === artist.id)

	const addArtist = (artist: SimpleArtist) => {
		if (contain(artist)) return
		insert(props.of, { path: ["data", "artists"], initialInput: artist.id })
		setArtists(artists.length, { id: artist.id, name: artist.name })
	}

	const removeArtistAt = (index: number) => () => {
		remove(props.of, { path: ["data", "artists"], at: index })
		setArtists((list) => list.toSpliced(index, 1))
	}

	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">Artists</FormComp.Label>
				<div class="flex gap-2">
					<ArtistSearchDialog
						onSelect={addArtist}
						dataFilter={(artist) => !contain(artist)}
						icon={<PlusIcon class="size-4" />}
					/>
				</div>
			</div>
			<FormComp.ErrorList
				errors={getErrors(props.of, { path: ["data", "artists"] })}
			/>
			<ul class="flex min-h-32 flex-col gap-2">
				<For
					each={artists}
					fallback={<FieldArrayFallback />}
				>
					{(artist, idx) => (
						<li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
							<span class="text-primary">{artist.name}</span>
							<div class="flex items-center gap-2">
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
												value={field.input ?? undefined}
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
									onClick={removeArtistAt(idx())}
									class="aspect-square"
								>
									<Cross1Icon class="mx-auto" />
								</Button>
							</div>
						</li>
					)}
				</For>
			</ul>
		</div>
	)
}
