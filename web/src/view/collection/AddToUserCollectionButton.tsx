import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { PlusIcon } from "@thc/icons/radix"
import { createSignal, Show } from "solid-js"

import { Button } from "~/component/atomic/button"
import type { UserCollectionItemEntityType } from "~/hey-api"
import { useCurrentUser } from "~/state/user"
import { px } from "~/style/tokens.stylex"

import { AddToCollectionDialog } from "./AddToCollectionDialog"

const styles = stylex.create({
	plusIcon: { width: px[16], height: px[16] },
})

type Props = {
	entityId: number
	entityType: UserCollectionItemEntityType
	styles?: StyleXStyles
}

export function AddToUserCollectionButton(props: Props) {
	const { t } = useLingui()
	const userCtx = useCurrentUser()
	const [open, setOpen] = createSignal(false)

	return (
		<Show when={userCtx.profile}>
			<Button
				onClick={() => setOpen(true)}
				appearance="outline"
				tone="gray"
				size="sm"
				styles={props.styles}
			>
				<PlusIcon {...stylex.attrs(styles.plusIcon)} />
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
