import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { Artist, ArtistCommonFilter } from "@thc/api"
import { PlusIcon } from "@thc/icons/radix"
import { ArtistQueryOption } from "@thc/query"
import { debounce } from "@thc/toolkit"
import { createSignal, createMemo } from "solid-js"
import type { JSX } from "solid-js"

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
	const { t } = useLingui()
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (value: string) => {
		setSearchKeyword(value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const artistsQuery = useQuery(() => ({
		...ArtistQueryOption.findByKeyword(searchTerm()!, {
			artist_type: props.queryFilter?.artist_type,
			exclusion: props.queryFilter?.exclusion,
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
			title={t`Search Artist`}
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
