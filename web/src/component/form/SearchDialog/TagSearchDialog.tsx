import { useLingui } from "@lingui/solid/macro"
import type { Tag } from "@thc/api"
import { PlusIcon } from "@thc/icons/radix"
import type { JSX } from "solid-js"

import { EntitySearchDialog } from "./EntitySearchDialog"
import { useTagSearch } from "./useTagSearch"

type TagSearchDialogProps = {
	onSelect: (tag: Tag) => void
	dataFilter?: (tag: Tag) => boolean
	trigger: JSX.Element
}

export function TagSearchDialog(props: TagSearchDialogProps): JSX.Element {
	const { t } = useLingui()
	const { searchKeyword, onInput, items } = useTagSearch(() => props.dataFilter)

	return (
		<EntitySearchDialog
			title={t`Search Tag`}
			trigger={props.trigger}
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
