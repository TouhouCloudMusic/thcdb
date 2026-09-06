import { useLingui } from "@lingui/solid/macro"
import { PlusIcon } from "@thc/icons/radix"
import { createSignal, Show } from "solid-js"

import { Button } from "~/component/atomic/button"
import type { UserCollectionItemEntityType } from "~/hey-api"
import { useCurrentUser } from "~/state/user"

import { AddToCollectionDialog } from "./AddToCollectionDialog"

export const ADD_TO_COLLECTION_ACTIONS_CLASS =
	"flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 empty:hidden"

type Props = {
	entityId: number
	entityType: UserCollectionItemEntityType
	class?: string
}

export function AddToUserCollectionButton(props: Props) {
	const { t } = useLingui()
	const userCtx = useCurrentUser()
	const [open, setOpen] = createSignal(false)

	return (
		<Show when={userCtx.profile}>
			<Button
				variant="SecondaryV2"
				size="Sm"
				onClick={() => setOpen(true)}
				class={props.class}
			>
				<PlusIcon class="size-4" />
				{t`Add to Collection`}
			</Button>

			<Show when={open()}>
				<AddToCollectionDialog
					open={open()}
					onOpenChange={setOpen}
					entityId={props.entityId}
					entityType={props.entityType}
				/>
			</Show>
		</Show>
	)
}
