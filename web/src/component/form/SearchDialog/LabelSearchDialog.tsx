import { Trans, useLingui } from "@lingui-solid/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { Label } from "@thc/api"
import { LabelQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createSignal, createMemo } from "solid-js"
import type { JSX, ParentProps } from "solid-js"
import { PlusIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"

import { EntitySearchDialog } from "./EntitySearchDialog"

type LabelSearchDialogProps = {
	onSelect: (label: Label) => void
	disabled?: boolean
}

export function LabelSearchDialog(
	props: ParentProps<LabelSearchDialogProps>,
): JSX.Element {
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (e: Event) => {
		setSearchKeyword((e.target as HTMLInputElement).value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const labelsQuery = useQuery(() => ({
		...LabelQueryOption.findByKeyword(searchTerm()!),
		placeholderData: id,
		enabled: Boolean(searchTerm()),
	}))

	return (
		<EntitySearchDialog
			title={<Trans>Search Label</Trans>}
			trigger={
				<Dialog.Trigger
					as={Button}
					variant="Tertiary"
					class="h-max p-2"
					disabled={props.disabled}
				>
					{props.children}
				</Dialog.Trigger>
			}
			value={searchKeyword()}
			onInput={onInput}
			items={labelsQuery.data}
			onSelect={props.onSelect}
			item={(label) => (
				<div class="flex items-center justify-between">
					<div class="text-left text-lg font-light text-primary">
						{label.name}
					</div>
					<div class="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
						<PlusIcon class="size-4 text-tertiary" />
					</div>
				</div>
			)}
		/>
	)
}
