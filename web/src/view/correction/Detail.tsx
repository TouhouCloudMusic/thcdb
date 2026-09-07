import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query"
import { Link } from "@tanstack/solid-router"
import { CorrectionQueryOption } from "@thc/query"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import type { JSX } from "solid-js"

import { inputStyles } from "~/component/atomic/Input"
import { Avatar } from "~/component/atomic/avatar"
import { Button, buttonStyles } from "~/component/atomic/button"
import { Select } from "~/component/atomic/form/select"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import { showErrorToast, showSuccessToast } from "~/component/toast"
import { hasUserPermission } from "~/domain/user/authorization"
import { USER_PERMISSION_NAMES } from "~/domain/user/constants"
import type {
	CorrectionDecision,
	CorrectionDetail,
	CorrectionDiffEntry,
	EntityType,
} from "~/hey-api"
import {
	moderateCorrectionMutation,
	setCorrectionSubscriptionMutation,
} from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout/PageLayout"
import { useCurrentUser } from "~/state/user"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { surfaceStyles } from "~/style/primitives"
import {
	radius,
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { formatTimestamp } from "~/utils/dateTime"
import { getErrorMessage } from "~/utils/getErrorMessage"
import { useEntityComments } from "~/view/comment/useEntityComments"

import { CorrectionComments } from "./CorrectionComments"
import {
	ENTITY_EDIT_ROUTE_MAP,
	ENTITY_HISTORY_MAP,
	ENTITY_ROUTE_MAP,
} from "./entityMap"
import { invalidatePendingCorrection } from "./pendingCorrection"

const styles = stylex.create({
	headerChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[16] },
	},
	fieldChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[4] },
	},
	listChild: {
		borderBottomWidth: { default: null, ":not(:last-child)": "1px" },
		borderBottomStyle: { default: null, ":not(:last-child)": "solid" },
		borderColor: palette.slate[200],
	},
	diffHeadingChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[4] },
	},
	before: {
		backgroundColor: palette.reimu[100],
		borderColor: palette.reimu[200],
	},
	after: {
		backgroundColor: palette.green[100],
		borderColor: palette.green[200],
	},
	heading: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		columnGap: px[16],
		rowGap: px[8],
	},
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	metadata: {
		display: "flex",
		flexWrap: "wrap",
		columnGap: px[48],
		rowGap: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	fieldLabel: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	author: {
		display: "inline-flex",
		alignItems: "center",
		gap: px[8],
		color: colors.textSecondary,
	},
	avatar: { width: px[20], height: px[20] },
	mobileValueLabel: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: ".025em",
		color: colors.textTertiary,
		display: { default: null, "@media (min-width: 48rem)": "none" },
	},
	value: {
		marginTop: 0,
		marginRight: 0,
		marginBottom: 0,
		marginLeft: 0,
		maxHeight: px[256],
		overflow: "auto",
		borderRadius: radius.md,
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		paddingLeft: px[12],
		paddingRight: px[12],
		paddingTop: px[8],
		paddingBottom: px[8],
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: "1.25rem",
		whiteSpace: "pre-wrap",
		color: palette.slate[800],
	},
	diffColumns: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		display: { default: "none", "@media (min-width: 48rem)": "grid" },
		borderColor: palette.slate[200],
		gridTemplateColumns: {
			default: null,
			"@media (min-width: 48rem)": "12rem 1fr 1fr",
		},
		gap: { default: null, "@media (min-width: 48rem)": px[12] },
		paddingLeft: { default: null, "@media (min-width: 48rem)": px[16] },
		paddingRight: { default: null, "@media (min-width: 48rem)": px[16] },
		paddingTop: { default: null, "@media (min-width: 48rem)": px[8] },
		paddingBottom: { default: null, "@media (min-width: 48rem)": px[8] },
	},
	columnLabel: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: ".025em",
		color: colors.textTertiary,
	},
	item: {
		display: "grid",
		gap: px[12],
		paddingLeft: px[16],
		paddingRight: px[16],
		paddingTop: px[12],
		paddingBottom: px[12],
		gridTemplateColumns: {
			default: null,
			"@media (min-width: 48rem)": "12rem 1fr 1fr",
		},
		alignItems: { default: null, "@media (min-width: 48rem)": "flex-start" },
	},
	fieldNameCell: { minWidth: 0 },
	fieldName: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textSecondary,
	},
	diffStatus: {
		paddingLeft: px[16],
		paddingRight: px[16],
		paddingTop: px[12],
		paddingBottom: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	actionSection: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-end",
		gap: px[8],
	},
	actions: {
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "flex-end",
		gap: px[8],
	},
	actionError: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.reimu[700],
	},
	pageLayout: {
		paddingTop: px[32],
		paddingRight: px[32],
		paddingBottom: px[32],
		paddingLeft: px[32],
	},
	detail: { display: "flex", flexDirection: "column", gap: px[24] },
	card: {
		overflow: "hidden",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[300],
		paddingTop: 0,
		paddingRight: 0,
		paddingBottom: 0,
		paddingLeft: 0,
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
	diffHeader: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[16],
		borderColor: palette.slate[300],
		paddingLeft: px[16],
		paddingRight: px[16],
		paddingTop: px[12],
		paddingBottom: px[12],
	},
	diffHeading: { minWidth: 0 },
	compareStatus: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	compare: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[8],
	},
	compareSelect: {
		height: px[36],
		minWidth: px[208],
		paddingLeft: px[8],
		paddingRight: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
})

type CorrectionHeaderProps = {
	correction: CorrectionDetail
	actions?: JSX.Element
}

function CorrectionHeader(props: CorrectionHeaderProps) {
	const { t } = useLingui()
	const entityRoute = () => ENTITY_ROUTE_MAP[props.correction.entity_type]
	const entityLabel = () =>
		(
			({
				Artist: t`Artist`,
				Label: t`Label`,
				Release: t`Release`,
				Song: t`Song`,
				Tag: t`Tag`,
				Event: t`Event`,
				SongLyrics: t`Song lyrics`,
				CreditRole: t`Credit role`,
			}) satisfies Record<EntityType, string>
		)[props.correction.entity_type]
	const entityTypeText = () => entityLabel().toLowerCase()

	return (
		<header>
			<div {...stylex.attrs(styles.headerChild, styles.heading)}>
				<h1 {...stylex.attrs(styles.title)}>
					<Trans>
						Correction of {entityTypeText()}{" "}
						<Link
							class={stylex.attrs(link.base, link.text).class}
							to={entityRoute()}
							params={{ id: props.correction.entity_id.toString() }}
						>
							{props.correction.entity_name}
						</Link>
					</Trans>
				</h1>
				{props.actions}
			</div>

			<div {...stylex.attrs(styles.headerChild, styles.metadata)}>
				<div>
					<div
						{...stylex.attrs(styles.fieldChild, styles.fieldLabel)}
					>{t`Type`}</div>
					<span {...stylex.attrs(styles.fieldChild)}>
						{props.correction.type}
					</span>
				</div>
				<div>
					<div
						{...stylex.attrs(styles.fieldChild, styles.fieldLabel)}
					>{t`Author`}</div>
					<Link
						to="/profile/$username"
						params={{ username: props.correction.author.name }}
						class={
							stylex.attrs(
								link.base,
								link.text,
								styles.fieldChild,
								styles.author,
							).class
						}
					>
						<Avatar
							user={props.correction.author}
							styles={styles.avatar}
						/>
						<span>{props.correction.author.name}</span>
					</Link>
				</div>
				<div>
					<div
						{...stylex.attrs(styles.fieldChild, styles.fieldLabel)}
					>{t`Created`}</div>
					<span {...stylex.attrs(styles.fieldChild)}>
						{formatTimestamp(props.correction.created_at, t`None`)}
					</span>
				</div>
				<div>
					<div
						{...stylex.attrs(styles.fieldChild, styles.fieldLabel)}
					>{t`Status`}</div>
					<span {...stylex.attrs(styles.fieldChild)}>
						{props.correction.status}
					</span>
				</div>
			</div>
		</header>
	)
}

const DIFF_TONE = {
	before: styles.before,
	after: styles.after,
}

type DiffValueProps = {
	label: string
	value?: string | null
	variant: "before" | "after"
}

function DiffValue(props: DiffValueProps) {
	const { t } = useLingui()

	return (
		<div>
			<div {...stylex.attrs(styles.fieldChild, styles.mobileValueLabel)}>
				{props.label}
			</div>
			<pre
				{...stylex.attrs(
					styles.value,
					DIFF_TONE[props.variant],
					styles.fieldChild,
				)}
			>
				{props.value ?? t`None`}
			</pre>
		</div>
	)
}

type DiffEntriesProps = {
	changes?: CorrectionDiffEntry[]
	isLoading: boolean
}

function DiffEntries(props: DiffEntriesProps) {
	const { t } = useLingui()
	const entries = () => props.changes ?? []

	return (
		<Switch
			fallback={
				<div>
					<div {...stylex.attrs(styles.diffColumns)}>
						<div {...stylex.attrs(styles.columnLabel)}>{t`Field`}</div>
						<div {...stylex.attrs(styles.columnLabel)}>{t`Before`}</div>
						<div {...stylex.attrs(styles.columnLabel)}>{t`After`}</div>
					</div>
					<ul>
						<For each={entries()}>
							{(entry) => (
								<li {...stylex.attrs(styles.listChild, styles.item)}>
									<div {...stylex.attrs(styles.fieldNameCell)}>
										<div
											{...stylex.attrs(styles.fieldName)}
											title={entry.path}
										>
											{entry.path}
										</div>
									</div>
									<DiffValue
										label={t`Before`}
										value={entry.before}
										variant="before"
									/>
									<DiffValue
										label={t`After`}
										value={entry.after}
										variant="after"
									/>
								</li>
							)}
						</For>
					</ul>
				</div>
			}
		>
			<Match when={props.isLoading}>
				<div
					{...stylex.attrs(styles.listChild, styles.diffStatus)}
				>{t`Loading diff...`}</div>
			</Match>
			<Match when={entries().length === 0}>
				<div
					{...stylex.attrs(styles.listChild, styles.diffStatus)}
				>{t`No changes detected.`}</div>
			</Match>
		</Switch>
	)
}

const COMPARE_BASELINE_VALUE = "__baseline__"

type ConfirmActionButtonProps = {
	title: string
	description: string
	confirmText: string
	tone: "green" | "reimu"
	appearance: "solid" | "soft"
	disabled: boolean
	onConfirm: () => void
	children: string
}

function ConfirmActionButton(props: ConfirmActionButtonProps) {
	const { t } = useLingui()
	const [open, setOpen] = createSignal(false)

	const confirm = () => {
		setOpen(false)
		props.onConfirm()
	}

	return (
		<AlertDialog
			open={open()}
			onOpenChange={setOpen}
			triggerAs={(triggerProps) => (
				<Button
					{...triggerProps}
					disabled={props.disabled}
					appearance={props.appearance}
					tone={props.tone}
					size="sm"
				>
					{props.children}
				</Button>
			)}
			title={props.title}
			description={props.description}
			confirmText={props.confirmText}
			cancelText={t`Cancel`}
			onCancel={() => setOpen(false)}
			onConfirm={confirm}
		/>
	)
}

type CorrectionActionsProps = {
	canManage: boolean
	canEdit: boolean
	correction: CorrectionDetail
	isBusy: boolean
	errorMessage?: string
	onApprove: () => void
	onReject: () => void
}

function CorrectionActions(props: CorrectionActionsProps) {
	const { t } = useLingui()
	const isPending = () => props.correction.status === "Pending"
	const editRoute = () => {
		if (!props.canEdit || !isPending()) return
		return ENTITY_EDIT_ROUTE_MAP[props.correction.entity_type]
	}

	return (
		<Show when={isPending()}>
			<div {...stylex.attrs(styles.actionSection)}>
				<div {...stylex.attrs(styles.actions)}>
					<Show when={editRoute()}>
						{(route) => (
							<Link
								to={route()}
								params={{ id: props.correction.entity_id.toString() }}
								search={{ correctionId: props.correction.id }}
								class={
									stylex.attrs(
										link.base,
										buttonStyles.base,
										buttonStyles.soft,
										buttonStyles.gray,
										buttonStyles.softGray,
										buttonStyles.sm,
									).class
								}
							>
								{t`Edit`}
							</Link>
						)}
					</Show>
					<Show when={props.canManage}>
						<ConfirmActionButton
							title={t`Approve correction?`}
							description={t({
								message: "This will apply the correction to the target entity.",
							})}
							confirmText={t`Approve`}
							tone="green"
							appearance="solid"
							disabled={props.isBusy || !isPending()}
							onConfirm={props.onApprove}
						>
							{t`Approve`}
						</ConfirmActionButton>
						<ConfirmActionButton
							title={t`Reject correction?`}
							description={t({
								message: "This will mark the correction as rejected.",
							})}
							confirmText={t`Reject`}
							tone="reimu"
							appearance="soft"
							disabled={props.isBusy || !isPending()}
							onConfirm={props.onReject}
						>
							{t`Reject`}
						</ConfirmActionButton>
					</Show>
				</div>
				<Show when={props.errorMessage}>
					{(message) => (
						<div {...stylex.attrs(styles.actionError)}>{message()}</div>
					)}
				</Show>
			</div>
		</Show>
	)
}

type CorrectionSubscribeButtonProps = {
	correctionId: number
	isSubscribed: boolean
}

function CorrectionSubscribeButton(props: CorrectionSubscribeButtonProps) {
	const { t } = useLingui()
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()
	const mutation = useMutation(setCorrectionSubscriptionMutation)

	const toggle = () => {
		const correctionId = props.correctionId
		void mutation
			.mutateAsync({
				path: { id: correctionId },
				query: { subscribed: !props.isSubscribed },
			})
			.then(
				userCtx.bindCurrentSession((response) => {
					queryClient.setQueryData<CorrectionDetail>(
						["correction::detail", correctionId],
						(detail) =>
							detail
								? {
										...detail,
										is_subscribed: response.data.subscribed,
									}
								: detail,
					)
				}),
				userCtx.bindCurrentSession(() => {
					showErrorToast({ title: t`Failed to update subscription` })
				}),
			)
	}

	return (
		<Button
			onClick={toggle}
			disabled={
				mutation.isPending || userCtx.session.status !== "authenticated"
			}
			appearance="soft"
			tone="reimu"
			size="sm"
		>
			{props.isSubscribed ? t`Unsubscribe` : t`Subscribe`}
		</Button>
	)
}

type CorrectionDetailPageProps = {
	correctionId: number
	compareId?: number | null
	onCompareIdChange: (value: number | undefined) => void
}

export function CorrectionDetailPage(props: CorrectionDetailPageProps) {
	const { t } = useLingui()
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()
	const correctionQuery = useQuery(() =>
		CorrectionQueryOption.detail(props.correctionId),
	)

	const moderateMutation = useMutation(() => ({
		...moderateCorrectionMutation(),
		onMutate: () => {
			const correction = correctionQuery.data
			if (!correction) return

			return {
				entityType: ENTITY_HISTORY_MAP[correction.entity_type],
				entityId: correction.entity_id,
			}
		},
		onSuccess: (_response, variables, entity) => {
			void queryClient.invalidateQueries({
				queryKey: ["correction::detail", variables.path.id],
			})
			void queryClient.invalidateQueries({ queryKey: ["correction::diff"] })
			void queryClient.invalidateQueries({ queryKey: ["correction::history"] })
			if (entity) {
				void invalidatePendingCorrection(
					queryClient,
					entity.entityType,
					entity.entityId,
				)
			}

			showSuccessToast({
				title:
					variables.query.decision === "Approve"
						? t`Correction approved`
						: t`Correction rejected`,
				description: t`Status updated`,
			})
		},
	}))

	const canManage = () =>
		hasUserPermission(
			userCtx.authorization,
			USER_PERMISSION_NAMES.CorrectionManage,
		)
	const canEdit = () =>
		canManage() || userCtx.profile?.name === correctionQuery.data?.author.name

	const activeCompareId = createMemo(() => {
		const compare = props.compareId
		if (!compare || compare === props.correctionId) return
		return compare
	})

	const diffQuery = useQuery(() => {
		const compare = activeCompareId()
		if (compare) {
			return CorrectionQueryOption.compare(compare, props.correctionId)
		}
		return CorrectionQueryOption.diff(props.correctionId)
	})

	const historyQuery = useQuery(() => {
		const correction = correctionQuery.data
		if (!correction) {
			return {
				queryKey: ["correction::history", "pending", props.correctionId],
				queryFn: () => [],
			}
		}

		return CorrectionQueryOption.history(
			ENTITY_HISTORY_MAP[correction.entity_type],
			correction.entity_id,
		)
	})

	const compareOptions = createMemo(() => {
		const items = historyQuery.data ?? []
		return items.filter((item) => item.id !== props.correctionId)
	})

	const compareSelectOptions = createMemo(() => [
		COMPARE_BASELINE_VALUE,
		...compareOptions().map((item) => item.id.toString()),
	])

	const getCompareLabel = (value: string) => {
		if (value === COMPARE_BASELINE_VALUE) return t`Previous approved baseline`
		const target = compareOptions().find((item) => item.id.toString() === value)
		if (!target) return value
		return `#${target.id} ${target.type} (${formatTimestamp(target.handled_at ?? target.created_at, t`None`)})`
	}

	const submitCorrectionDecision = (decision: CorrectionDecision) => {
		moderateMutation.mutate({
			path: { id: props.correctionId },
			query: { decision },
		})
	}

	const actionErrorMessage = createMemo(() => {
		if (!moderateMutation.isError) return
		return getErrorMessage(moderateMutation.error, t`Request failed.`)
	})

	return (
		<PageLayout styles={styles.pageLayout}>
			<Show
				when={correctionQuery.data}
				fallback={
					<div {...stylex.attrs(styles.fieldLabel)}>{t`Loading...`}</div>
				}
			>
				{(correction) => (
					<div {...stylex.attrs(styles.detail)}>
						<CorrectionHeader
							correction={correction()}
							actions={
								<>
									<Show when={correction().is_subscribed != null}>
										<CorrectionSubscribeButton
											correctionId={correction().id}
											isSubscribed={correction().is_subscribed ?? false}
										/>
									</Show>
									<CorrectionActions
										canManage={canManage()}
										canEdit={canEdit()}
										correction={correction()}
										isBusy={moderateMutation.isPending}
										errorMessage={actionErrorMessage()}
										onApprove={() => submitCorrectionDecision("Approve")}
										onReject={() => submitCorrectionDecision("Reject")}
									/>
								</>
							}
						/>
						<div {...stylex.attrs(surfaceStyles.card, styles.card)}>
							<div {...stylex.attrs(styles.diffHeader)}>
								<div {...stylex.attrs(styles.diffHeading)}>
									<div
										{...stylex.attrs(
											styles.fieldLabel,
											styles.diffHeadingChild,
										)}
									>{t`DIFF`}</div>
									<Switch>
										<Match when={diffQuery.isLoading}>
											<div
												{...stylex.attrs(
													styles.compareStatus,
													styles.diffHeadingChild,
												)}
											>{t`Loading...`}</div>
										</Match>
										<Match when={!diffQuery.data}>
											<div
												{...stylex.attrs(
													styles.compareStatus,
													styles.diffHeadingChild,
												)}
											>
												{t`No diff data.`}
											</div>
										</Match>
									</Switch>
								</div>

								<label {...stylex.attrs(styles.compare)}>
									<span {...stylex.attrs(styles.fieldLabel)}>{t`Compare`}</span>
									<Select.Root<string>
										options={compareSelectOptions()}
										value={
											activeCompareId()?.toString() ?? COMPARE_BASELINE_VALUE
										}
										onChange={(value) => {
											const next =
												value === COMPARE_BASELINE_VALUE
													? undefined
													: Number(value)
											props.onCompareIdChange(next)
										}}
										itemComponent={(itemProps) => (
											<Select.Item item={itemProps.item}>
												{getCompareLabel(itemProps.item.rawValue)}
											</Select.Item>
										)}
									>
										<Select.Trigger
											styles={[inputStyles.like, styles.compareSelect]}
										>
											<Select.Value<string>>
												{(state) => getCompareLabel(state.selectedOption())}
											</Select.Value>
											<Select.Icon />
										</Select.Trigger>
										<Select.Portal>
											<Select.Content>
												<Select.Listbox />
											</Select.Content>
										</Select.Portal>
									</Select.Root>
								</label>
							</div>

							<DiffEntries
								changes={diffQuery.data?.changes}
								isLoading={diffQuery.isLoading}
							/>
						</div>

						<Show
							when={correction().id}
							keyed
						>
							{(correctionId) => {
								const model = useEntityComments(() => ({
									entityType: "correction",
									entityId: correctionId,
									initialPage: {
										data: correction().comments,
										updatedAt: correctionQuery.dataUpdatedAt,
									},
								}))

								return <CorrectionComments model={model} />
							}}
						</Show>
					</div>
				)}
			</Show>
		</PageLayout>
	)
}
