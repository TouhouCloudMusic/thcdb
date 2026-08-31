import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { CreditRoleRef } from "@thc/api"
import { PlusIcon } from "@thc/icons/radix"
import { CreditRoleQueryOption } from "@thc/query"
import { debounce, id } from "@thc/toolkit"
import { createMemo, createSignal } from "solid-js"
import type { JSX } from "solid-js"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"

import { EntitySearchDialog } from "./EntitySearchDialog"

type Props = {
	onSelect: (role: CreditRoleRef) => void
	disabled?: boolean
	icon: JSX.Element
}

export function CreditRoleSearchDialog(props: Props): JSX.Element {
	const { t } = useLingui()
	const [searchKeyword, setSearchKeyword] = createSignal("")

	const onInput = debounce(300, (value: string) => {
		setSearchKeyword(value)
	})

	const searchTerm = createMemo(() => {
		const keyword = searchKeyword().trim()
		return keyword.length > 1 ? keyword : undefined
	})

	const rolesQuery = useQuery(() => ({
		...CreditRoleQueryOption.findByKeyword(searchTerm()!),
		placeholderData: id,
		enabled: Boolean(searchTerm()),
	}))

	return (
		<EntitySearchDialog
			title={t`Search Role`}
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
			items={rolesQuery.data}
			onSelect={props.onSelect}
			item={(role) => (
				<div class="flex items-center justify-between">
					<div class="text-left text-lg font-light text-primary">
						{role.name}
					</div>
					<div class="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
						<PlusIcon class="size-4 text-tertiary" />
					</div>
				</div>
			)}
		/>
	)
}
