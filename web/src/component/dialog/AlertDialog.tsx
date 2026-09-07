import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Show, splitProps } from "solid-js"
import type { ComponentProps, JSX } from "solid-js"

import { Button } from "~/component/atomic/button"
import { radius, fontSizes, px } from "~/style/tokens.stylex"

import { Dialog } from "."

const styles = stylex.create({
	content: {
		boxShadow: "var(--shadow-2)",
		display: "flex",
		height: px[192],
		width: px[384],
		flexDirection: "column",
		justifyContent: "space-between",
		borderRadius: radius.md,
		padding: px[24],
	},
	title: { fontSize: fontSizes.lg, lineHeight: "1.75rem" },
	actions: { display: "flex", justifyContent: "flex-end", gap: px[8] },
	cancel: { marginLeft: "auto" },
})

export type AlertDialogProps = Exclude<Dialog.RootProps, "children"> & {
	title: string
	triggerAs?: (props: TriggerAsProps) => JSX.Element
	description: string
	onCancel: () => void
	onConfirm: () => void
	cancelText?: string
	confirmText?: string
	hideCancel?: boolean
	dismissible?: boolean | undefined
}

type TriggerAsProps = Omit<ComponentProps<typeof Button>, "children">

export function AlertDialog(props: AlertDialogProps) {
	const { t } = useLingui()
	const handleDismiss = (e: Event) => {
		if (props.dismissible === false) {
			e.preventDefault()
		}
	}

	const [local, root_props] = splitProps(props, [
		"title",
		"triggerAs",
		"description",
		"onCancel",
		"onConfirm",
		"cancelText",
		"confirmText",
		"hideCancel",
		"dismissible",
	])
	return (
		<Dialog.Root {...root_props}>
			<Show when={local.triggerAs}>
				{(triggerAs) => (
					<Dialog.Trigger
						as={triggerAs() as ComponentProps<typeof Dialog.Trigger>["as"]}
					/>
				)}
			</Show>
			<Dialog.Portal>
				<Dialog.Overlay />
				<Dialog.Content
					styles={styles.content}
					onPointerDownOutside={handleDismiss}
					onEscapeKeyDown={handleDismiss}
				>
					<div>
						<Dialog.Title styles={styles.title}>{local.title}</Dialog.Title>
						<Dialog.Description>{local.description}</Dialog.Description>
					</div>
					<div {...stylex.attrs(styles.actions)}>
						<Show when={!local.hideCancel}>
							<Dialog.CloseButton
								appearance="ghost"
								tone="gray"
								size="sm"
								styles={styles.cancel}
								onClick={local.onCancel}
							>
								{local.cancelText ?? t`Cancel`}
							</Dialog.CloseButton>
						</Show>
						<Button
							appearance="solid"
							tone="reimu"
							size="sm"
							onClick={local.onConfirm}
						>
							{local.confirmText ?? t`Confirm`}
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
