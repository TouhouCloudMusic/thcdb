import * as M from "@modular-forms/solid"
import type { Artist, ArtistCommonFilter } from "@thc/api"
import { createMemo } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Cross1Icon } from "solid-radix-icons"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form/FieldArrayFallback"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"

import { useArtistForm } from "../context"

export const ArtistFormAliasesField = () => {
	let [aliases, setAliases] = createStore<Artist[]>([])

	let handleSelect = (artist: Artist) => {
		if (!aliases.some((x) => x.id == artist.id)) {
			setAliases(
				produce((s) => {
					s.push(artist)
				}),
			)
		}
	}

	let handleRemove = (idx: number) => {
		setAliases(
			produce((s) => {
				s.splice(idx, 1)
			}),
		)
	}

	let { formStore } = useArtistForm()

	let filter = createMemo<ArtistCommonFilter>(() => {
		let exclusion = aliases.map((x) => x.id)
		let ty = M.getValue(formStore, "data.artist_type", {
			shouldActive: false,
		})
		let artist_type = ty ? [ty] : undefined
		return {
			artist_type,
			exclusion,
		}
	})

	return (
		<div class="flex min-h-32 w-96 flex-col">
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">Aliases</FormComp.Label>
				<div class="flex gap-2">
					<ArtistSearchDialog
						onSelect={handleSelect}
						queryFilter={filter()}
					/>
				</div>
			</div>
			<ul class="flex h-full flex-col gap-2">
				<Intersperse
					of={aliases}
					with={<Divider horizontal />}
					fallback={<FieldArrayFallback />}
				>
					{(alias, idx) => (
						<AliasListItem
							index={idx()}
							onRemove={() => handleRemove(idx())}
							artist={alias}
						/>
					)}
				</Intersperse>
			</ul>
		</div>
	)
}

type AliasListItemProps = {
	index: number
	onRemove: () => void
	artist: Artist
}

const AliasListItem = (props: AliasListItemProps) => {
	let { formStore } = useArtistForm()
	return (
		<li class="grid h-fit grid-cols-[1fr_auto]">
			<M.Field
				of={formStore}
				name={`data.aliases.${props.index}`}
			>
				{(field, fieldProps) => (
					<>
						<input
							{...fieldProps}
							type="number"
							hidden
							value={field.value}
						/>
						<div>{props.artist.name}</div>
					</>
				)}
			</M.Field>

			<Button
				variant="Tertiary"
				size="Sm"
				onClick={props.onRemove}
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}
