import { Trans } from "@lingui-solid/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { Tag } from "@thc/api"
import { TagQueryOption } from "@thc/query"
import { debounce } from "@thc/toolkit"
import { createMemo, createSignal } from "solid-js"
import type { JSX } from "solid-js"
import { PlusIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"

import { EntitySearchDialog } from "./EntitySearchDialog"

type TagSearchDialogProps = {
	onSelect: (tag: Tag) => void
	disabled?: boolean
	dataFilter?: (tag: Tag) => boolean
	icon: JSX.Element
}

export function TagSearchDialog(props: TagSearchDialogProps): JSX.Element {
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (e: Event) => {
		setSearchKeyword((e.target as HTMLInputElement).value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const tagsQuery = useQuery(() => ({
		...TagQueryOption.findByKeyword(searchTerm()!),
		placeholderData: (previous) => {
			if (!previous) return previous
			if (props.dataFilter) {
				return previous.filter(props.dataFilter)
			}
			return previous
		},
		enabled: Boolean(searchTerm()),
	}))

	const items = createMemo(() => {
		if (!tagsQuery.isSuccess) return [] as Tag[]
		let list = tagsQuery.data ?? []
		if (props.dataFilter) {
			return list.filter(props.dataFilter)
		}
		return list
	})

	return (
		<EntitySearchDialog
			title={<Trans>Search Tag</Trans>}
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
			item={(tag) => (
				<div class="flex items-center justify-between">
					<div class="flex flex-col text-left font-light text-primary">
						<span class="text-lg">{tag.name}</span>
						<span class="text-sm text-tertiary">{tag.type}</span>
					</div>
					<div class="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
						<PlusIcon class="size-4 text-tertiary" />
					</div>
				</div>
			)}
		/>
	)
}
