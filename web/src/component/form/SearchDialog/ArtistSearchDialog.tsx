import { Trans, useLingui } from "@lingui-solid/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { Artist, ArtistCommonFilter } from "@thc/api"
import { ArtistQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createSignal, createMemo } from "solid-js"
import type { JSX } from "solid-js"
import { PlusIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"

import { EntitySearchDialog } from "./EntitySearchDialog"

type ArtistSearchDialogProps = {
	onSelect: (artist: Artist) => void
	disabled?: boolean
	queryFilter?: ArtistCommonFilter
	dataFilter?: (artist: Artist) => boolean
	icon: JSX.Element
}

export function ArtistSearchDialog(
	props: ArtistSearchDialogProps,
): JSX.Element {
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (e: Event) => {
		setSearchKeyword((e.target as HTMLInputElement).value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const artistsQuery = useQuery(() => ({
		...ArtistQueryOption.findByKeyword(searchTerm()!, {
			artist_type: props.queryFilter?.artist_type,
		}),
		placeholderData: (artist) => {
			if (!artist) return
			if (props.dataFilter) {
				return artist.filter(props.dataFilter)
			}
			return artist
		},
		enabled: Boolean(searchTerm()),
	}))

	return (
		<EntitySearchDialog
			title={<Trans>Search Artist</Trans>}
			trigger={
				<Dialog.Trigger
					as={Button}
					variant="Tertiary"
					class="h-max p-2"
					disabled={props.disabled}
				>
					{props.icon}
				</Dialog.Trigger>
			}
			value={searchKeyword()}
			onInput={onInput}
			items={
				artistsQuery.isSuccess
					? props.dataFilter
						? artistsQuery.data.filter(props.dataFilter)
						: artistsQuery.data
					: []
			}
			onSelect={props.onSelect}
			item={(artist) => (
				<div class="flex items-center justify-between">
					<div class="text-left text-lg font-light text-primary">
						{artist.name}
					</div>
					<div class="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
						<PlusIcon class="size-4 text-tertiary" />
					</div>
				</div>
			)}
		/>
	)
}
