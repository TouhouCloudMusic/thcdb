import { Field, getInput, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { Artist, ArtistCommonFilter } from "@thc/api"
import { createMemo } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"

import { useArtistForm } from "../context"

export const ArtistFormAliasesField = () => {
	const { t } = useLingui()
	const [aliases, setAliases] = createStore<Artist[]>([])

	const { formStore } = useArtistForm()

	const handleSelect = (artist: Artist) => {
		if (aliases.some((x) => x.id == artist.id)) return

		setAliases(
			produce((s) => {
				s.push(artist)
			}),
		)

		insert(formStore, { path: ["data", "aliases"], initialInput: artist.id })
	}

	const handleRemove = (idx: number) => {
		setAliases(
			produce((s) => {
				s.splice(idx, 1)
			}),
		)
		remove(formStore, { path: ["data", "aliases"], at: idx })
	}

	const filter = createMemo<ArtistCommonFilter>(() => {
		const exclusion = aliases.map((x) => x.id)
		const ty = getInput(formStore, { path: ["data", "artist_type"] })
		const artist_type = ty ? [ty] : undefined
		return {
			artist_type,
			exclusion,
		}
	})

	return (
		<div class="flex min-h-32 w-96 flex-col">
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">{t`Aliases`}</FormComp.Label>
				<div class="flex gap-2">
					<ArtistSearchDialog
						onSelect={handleSelect}
						queryFilter={filter()}
						icon={<PlusIcon class="size-4 text-slate-600" />}
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
	const { formStore } = useArtistForm()

	return (
		<li class="grid h-fit grid-cols-[1fr_auto]">
			<Field
				of={formStore}
				path={["data", "aliases", props.index]}
			>
				{(field) => (
					<>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? props.artist.id}
						/>
						<div>{props.artist.name}</div>
					</>
				)}
			</Field>

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
