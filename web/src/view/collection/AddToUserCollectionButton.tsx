import { useLingui } from "@lingui/solid/macro"
import { createSignal, Show } from "solid-js"
import { PlusIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import type { UserCollectionItemEntityType } from "~/hey-api"
import { useCurrentUser } from "~/state/user"

import { AddToCollectionDialog } from "./AddToCollectionDialog"

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
		<Show when={userCtx.is_signed_in}>
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
