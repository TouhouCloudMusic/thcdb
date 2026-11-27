import { msg } from "@lingui/core/macro"
import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { createSignal, Match, Show, Switch } from "solid-js"

import { Button } from "~/component/atomic/button"
import { buttonVars } from "~/component/atomic/button/button.stylex"
import { Dialog } from "~/component/dialog"
import { IMAGE_QUEUE_STATUS_LABELS } from "~/component/image_queue/statusLabels"
import { showErrorToast } from "~/component/toast"
import type {
	ImageQueueAction,
	ImageQueueDetail,
	ImageQueueStatus,
} from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	colors,
	fontSizes,
	lineHeights,
	px,
	radius,
} from "~/style/tokens.stylex"
import * as typography from "~/style/typography"
import { formatTimestamp } from "~/utils/dateTime"
import { getErrorMessage } from "~/utils/getErrorMessage"

export const submissionLayout = stylex.create({
	sections: { display: "grid", gap: px[32], minWidth: 0 },
	discussion: {
		position: "relative",
		"::before": {
			content: '""',
			position: "absolute",
			insetInline: 0,
			insetBlockStart: {
				default: `calc(-1 * ${px[16]})`,
				":only-child": `calc(-1 * ${px[8]})`,
			},
			borderTopWidth: "1px",
			borderTopStyle: "solid",
			borderTopColor: palette.slate[200],
		},
	},
})

const styles = stylex.create({
	summary: {
		display: "grid",
		gridTemplateColumns: {
			default: "minmax(0, 1fr)",
			"@container (min-width: 44rem)": "minmax(0, 2fr) minmax(0, 1fr)",
		},
		alignItems: "end",
		gap: px[16],
	},
	copy: {
		display: "grid",
		gap: px[12],
		overflowWrap: "anywhere",
	},
	note: { display: "grid", gap: px[4] },
	copyText: {
		color: colors.textSecondary,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	noteText: { whiteSpace: "pre-wrap" },
	auditDate: { fontVariantNumeric: "tabular-nums" },
	actions: {
		display: "grid",
		gap: px[8],
		gridColumn: { default: "auto", "@container (min-width: 44rem)": "2" },
	},
	pendingActions: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
	reviewTrigger: {
		minWidth: 0,
		whiteSpace: "normal",
		overflowWrap: "anywhere",
	},
	approveTrigger: {
		[buttonVars.border]: palette.green[500],
		[buttonVars.borderHover]: palette.green[600],
	},
	rejectTrigger: {
		borderColor: {
			default: palette.reimu[500],
			":hover": {
				default: null,
				"@media (hover: hover)": palette.reimu[600],
			},
			":disabled": palette.slate[200],
		},
	},
	confirm: {
		animationName: "none",
		display: "grid",
		gap: px[12],
		width: `min(${px[320]}, calc(100vw - ${px[32]}))`,
		padding: px[16],
		borderRadius: radius.sm,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: palette.slate[300],
		boxShadow: `0 4px 12px ${palette.slate[200]}`,
	},
	confirmTitle: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		overflowWrap: "anywhere",
	},
	confirmActions: {
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "end",
		gap: px[8],
	},
})

export function ImageQueueUserLink(props: { name: string }) {
	return (
		<Link
			to="/profile/$username/image-queue"
			params={{ username: props.name }}
			class={stylex.attrs(link.base, link.withUnderline).class}
		>
			{props.name}
		</Link>
	)
}

function ImageQueueAuditRecord(props: {
	status: ImageQueueStatus
	name?: string
	date?: string | null
}) {
	const { t } = useLingui()
	const status = () => t(IMAGE_QUEUE_STATUS_LABELS[props.status])
	return (
		<Show when={props.name ?? props.date}>
			<p {...stylex.attrs(styles.copyText)}>
				<Show
					when={props.name}
					fallback={status()}
				>
					{(name) => (
						<Trans>
							{status()} by <ImageQueueUserLink name={name()} />
						</Trans>
					)}
				</Show>
				<Show when={props.date}>
					{(date) => (
						<>
							{" · "}
							<time
								dateTime={date()}
								{...stylex.attrs(styles.auditDate)}
							>
								{formatTimestamp(date())}
							</time>
						</>
					)}
				</Show>
			</p>
		</Show>
	)
}

type AuditFields = Pick<
	ImageQueueDetail,
	"status" | "handled_by" | "handled_at" | "reverted_by" | "reverted_at"
>

function ImageQueueAudit(props: { detail: AuditFields }) {
	return (
		<>
			<ImageQueueAuditRecord
				status={
					props.detail.status === "Reverted" ? "Approved" : props.detail.status
				}
				name={props.detail.handled_by?.name}
				date={props.detail.handled_at}
			/>
			<ImageQueueAuditRecord
				status="Reverted"
				name={props.detail.reverted_by?.name}
				date={props.detail.reverted_at}
			/>
		</>
	)
}

const ACTION_TONES = {
	Approve: "green",
	Reject: "reimu",
	Revert: "slate",
} as const

const ACTION_LABELS = {
	Approve: msg`Approve`,
	Reject: msg`Reject`,
	Revert: msg`Revert`,
} satisfies Record<ImageQueueAction, ReturnType<typeof msg>>

function ImageQueueReviewAction(props: {
	action: ImageQueueAction
	targetName?: string
	disabled: boolean
	onConfirm: (action: ImageQueueAction) => Promise<void>
}) {
	const { t } = useLingui()
	const [open, setOpen] = createSignal(false)
	const label = () => t(ACTION_LABELS[props.action])
	const title = () => {
		const name = props.targetName
		switch (props.action) {
			case "Approve": {
				return name ? t`Approve the image for ${name}?` : t`Approve image?`
			}
			case "Reject": {
				return t`Reject image?`
			}
			case "Revert": {
				return name
					? t`Revert the image approval for ${name}?`
					: t`Revert image approval?`
			}
		}
	}
	const confirm = () => {
		setOpen(false)
		void props.onConfirm(props.action)
	}

	return (
		<Dialog.Root
			open={open()}
			onOpenChange={setOpen}
			modal={false}
		>
			<Dialog.Trigger
				as={Button}
				disabled={props.disabled}
				appearance="outline"
				tone={ACTION_TONES[props.action]}
				size="sm"
				styles={[
					styles.reviewTrigger,
					props.action === "Approve" && styles.approveTrigger,
					props.action === "Reject" && styles.rejectTrigger,
				]}
			>
				{label()}
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Content styles={styles.confirm}>
					<Dialog.Title styles={styles.confirmTitle}>{title()}</Dialog.Title>
					<div {...stylex.attrs(styles.confirmActions)}>
						<Dialog.CloseButton
							aria-label={t`Cancel`}
							appearance="outline"
							tone="slate"
							size="sm"
						>
							{t`Cancel`}
						</Dialog.CloseButton>
						<Button
							disabled={props.disabled}
							appearance="solid"
							tone={ACTION_TONES[props.action]}
							size="sm"
							onClick={confirm}
						>
							{label()}
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

type ReviewActionsProps = {
	targetName?: string
	disabled: boolean
	onModerate: (action: ImageQueueAction) => void | Promise<void>
}

function ImageQueueReviewActions(
	props: ReviewActionsProps & { status: ImageQueueStatus },
) {
	const { t } = useLingui()
	const [reviewing, setReviewing] = createSignal(false)
	const disabled = () => reviewing() || props.disabled
	const review = async (action: ImageQueueAction) => {
		if (disabled()) return
		setReviewing(true)
		try {
			await props.onModerate(action)
		} catch (error) {
			const message = getErrorMessage(error)
			showErrorToast({ title: t`Review failed: ${message}` })
		} finally {
			setReviewing(false)
		}
	}
	return (
		<div
			{...stylex.attrs(
				styles.actions,
				props.status === "Pending" && styles.pendingActions,
			)}
		>
			<Switch>
				<Match when={props.status === "Pending"}>
					<ImageQueueReviewAction
						action="Approve"
						targetName={props.targetName}
						disabled={disabled()}
						onConfirm={review}
					/>
					<ImageQueueReviewAction
						action="Reject"
						disabled={disabled()}
						onConfirm={review}
					/>
				</Match>
				<Match when={props.status === "Approved"}>
					<ImageQueueReviewAction
						action="Revert"
						targetName={props.targetName}
						disabled={disabled()}
						onConfirm={review}
					/>
				</Match>
			</Switch>
		</div>
	)
}

export function ImageQueueSubmissionInfo(props: {
	detail: AuditFields & Pick<ImageQueueDetail, "description">
	review?: ReviewActionsProps
}) {
	const { t } = useLingui()
	const hasCopy = () =>
		Boolean(
			props.detail.description
			|| props.detail.handled_by
			|| props.detail.handled_at
			|| props.detail.reverted_by
			|| props.detail.reverted_at,
		)
	const review = () =>
		["Pending", "Approved"].includes(props.detail.status)
			? props.review
			: undefined

	return (
		<Show when={hasCopy() || review()}>
			<div {...stylex.attrs(styles.summary)}>
				<Show when={hasCopy()}>
					<div {...stylex.attrs(styles.copy)}>
						<Show when={props.detail.description}>
							{(description) => (
								<div {...stylex.attrs(styles.note)}>
									<h2 {...stylex.attrs(typography.heading.xs)}>
										{t`Description`}
									</h2>
									<p {...stylex.attrs(styles.copyText, styles.noteText)}>
										{description()}
									</p>
								</div>
							)}
						</Show>
						<ImageQueueAudit detail={props.detail} />
					</div>
				</Show>
				<Show when={review()}>
					{(options) => (
						<ImageQueueReviewActions
							status={props.detail.status}
							targetName={options().targetName}
							disabled={options().disabled}
							onModerate={options().onModerate}
						/>
					)}
				</Show>
			</div>
		</Show>
	)
}
