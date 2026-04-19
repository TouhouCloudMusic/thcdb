import { t } from "@lingui/core/macro"
import { useQuery } from "@tanstack/solid-query"
import type { Song } from "@thc/api"
import { SongQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createMemo, createSignal } from "solid-js"
import type { JSX } from "solid-js"
import { PlusIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"

import { EntitySearchDialog } from "./EntitySearchDialog"

type SongSearchDialogProps = {
	onSelect: (song: Song) => void
	disabled?: boolean
	dataFilter?: (song: Song) => boolean
	icon: JSX.Element
}

export function SongSearchDialog(props: SongSearchDialogProps): JSX.Element {
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (value: string) => {
		setSearchKeyword(value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword()
		return keyword.length > 1 ? keyword : undefined
	})

	const songsQuery = useQuery(() => ({
		...SongQueryOption.findByKeyword(searchTerm()!),
		placeholderData: id,
		enabled: Boolean(searchTerm()),
	}))

	const items = createMemo(() => {
		if (!songsQuery.isSuccess) return [] as Song[]
		if (!props.dataFilter) return songsQuery.data
		return songsQuery.data.filter(props.dataFilter)
	})

	return (
		<EntitySearchDialog
			title={t`Search Song`}
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
			items={items()}
			onSelect={props.onSelect}
			item={(song) => (
				<div class="flex items-center justify-between">
					<div class="text-left text-lg font-light text-primary">
						{song.title}
					</div>
					<div class="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
						<PlusIcon class="size-4 text-tertiary" />
					</div>
				</div>
			)}
		/>
	)
}
