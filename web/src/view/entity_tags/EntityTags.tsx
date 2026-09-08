import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query"
import { Link } from "@tanstack/solid-router"
import type { Tag } from "@thc/api"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import type { JSX } from "solid-js"
import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js"

import { Button } from "~/component/atomic/button"
import { Intersperse } from "~/component/data/Intersperse"
import { Dialog } from "~/component/dialog"
import { PRIMARY_TAG_RELEVANCE_THRESHOLD } from "~/domain/tag/constants"
import {
	deleteVoteMutation,
	getTagsOptions,
	getTagsQueryKey,
	voteTagMutation,
} from "~/hey-api/@tanstack/solid-query.gen"
import { useCurrentUser } from "~/state/user"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

import { EntityTagAddDialog } from "./EntityTagAddDialog"
import {
	ENTITY_TAG_VOTE_OPTIONS,
	createEntityTagFilter,
	scoreFromUserVote,
	sortEntityTags,
} from "./model"
import type {
	EntityTagAggregate,
	EntityTagVoteValue,
	EntityTaggableType,
} from "./model"

const styles = stylex.create({
	listChild: {
		borderBottomWidth: { default: null, ":not(:last-child)": "1px" },
		borderBottomStyle: { default: null, ":not(:last-child)": "solid" },
		borderColor: palette.slate[100],
	},
	tagSummaryChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[4] },
	},
	root: {
		display: "grid",
		minHeight: px[24],
		gridTemplateColumns: "auto minmax(0,1fr) auto",
		alignItems: "center",
		columnGap: px[16],
	},
	heading: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	status: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	tagLists: {
		display: "flex",
		minWidth: 0,
		flexDirection: "column",
		gap: px[4],
	},
	primaryTags: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textPrimary,
	},
	secondaryWithPrimary: { fontSize: fontSizes.xs, lineHeight: lineHeights.xs },
	secondaryOnly: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm },
	secondaryTags: { color: colors.textTertiary },
	trigger: { width: px[24], height: px[24] },
	dialog: {
		display: "flex",
		minHeight: "60vh",
		width: "100%",
		maxWidth: px[896],
		flexDirection: "column",
		borderRadius: radius.md,
		backgroundColor: palette.white,
		paddingTop: px[24],
		paddingRight: px[24],
		paddingBottom: px[24],
		paddingLeft: px[24],
		boxShadow:
			"0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
	},
	dialogHeader: {
		marginBottom: px[8],
		display: "flex",
		flexShrink: 0,
		alignItems: "center",
		gap: px[16],
	},
	title: {
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
		fontWeight: 300,
		letterSpacing: "-0.025em",
	},
	count: {
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
		paddingLeft: px[8],
		paddingRight: px[8],
		paddingTop: px[2],
		paddingBottom: px[2],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: colors.textTertiary,
	},
	spacer: { flex: "1" },
	plusIcon: { width: px[16], height: px[16] },
	closeButton: {
		display: "flex",
		height: px[32],
		width: px[32],
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 0,
		paddingRight: 0,
		paddingBottom: 0,
		paddingLeft: 0,
		color: { default: palette.slate[500], ":disabled": palette.slate[600] },
	},
	list: { minHeight: 0, flex: "1", overflowY: "auto" },
	item: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[16],
		paddingTop: px[12],
		paddingBottom: px[12],
	},
	tagSummary: { minWidth: 0, flex: "1" },
	tagName: {
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		fontWeight: 300,
		color: colors.textPrimary,
	},
	description: {
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 2,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	metadata: {
		marginTop: px[4],
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: px[12],
		rowGap: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	voteHistory: {
		marginTop: px[8],
		display: "flex",
		flexDirection: "column",
		gap: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	voteValue: { fontWeight: 500 },
	actions: {
		display: "flex",
		flexShrink: 0,
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[8],
	},
	vote: { minWidth: px[64] },
	pendingVote: { opacity: 0.7 },
})

type EntityTagsProps = {
	styles?: StyleXStyles
	entityType: EntityTaggableType
	entityId: number
}

const TAG_QUERY_LIMIT = 100

type ManageTagsDialogProps = {
	tags: EntityTagAggregate[]
	isSignedIn: boolean
	dataFilter?: (tag: Tag) => boolean
	pendingKey?: string
	onVote: (tagId: number, score: EntityTagVoteValue) => Promise<void>
	onRemoveVote: (tagId: number) => Promise<void>
	trigger: JSX.Element
}

type EntityTagRowProps = {
	styles?: StyleXStyles
	tag: EntityTagAggregate
	isSignedIn: boolean
	pendingKey?: string
	onVote: (tagId: number, score: EntityTagVoteValue) => Promise<void>
	onRemoveVote: (tagId: number) => Promise<void>
}

export function EntityTags(props: EntityTagsProps) {
	const userCtx = useCurrentUser()
	const queryClient = useQueryClient()
	const [pendingKey, setPendingKey] = createSignal<string>()
	const tagsRequest = createMemo(() => ({
		path: {
			entity_type: props.entityType,
			id: props.entityId,
		},
		query: {
			limit: TAG_QUERY_LIMIT,
		},
	}))
	const tagsQuery = useQuery(() => getTagsOptions(tagsRequest()))
	const voteMutation = useMutation(() => voteTagMutation())
	const removeMutation = useMutation(() => deleteVoteMutation())
	const tags = createMemo(() =>
		sortEntityTags((tagsQuery.data?.data ?? { items: [] }).items),
	)
	const dataFilter = createMemo(() => createEntityTagFilter(tags()))

	const invalidateTags = async () => {
		await queryClient.invalidateQueries({
			queryKey: getTagsQueryKey(tagsRequest()),
		})
	}

	const vote = async (tagId: number, score: EntityTagVoteValue) => {
		setPendingKey(`vote:${tagId}`)
		try {
			await voteMutation.mutateAsync({
				path: tagsRequest().path,
				body: {
					tag_id: tagId,
					score,
				},
			})
			await invalidateTags()
		} finally {
			setPendingKey(undefined)
		}
	}

	const removeVote = async (tagId: number) => {
		setPendingKey(`remove:${tagId}`)
		try {
			await removeMutation.mutateAsync({
				path: tagsRequest().path,
				body: {
					tag_id: tagId,
				},
			})
			await invalidateTags()
		} finally {
			setPendingKey(undefined)
		}
	}

	return (
		<EntityTagsView
			styles={props.styles}
			tags={tags()}
			isSignedIn={userCtx.profile !== undefined}
			isLoading={tagsQuery.isLoading}
			dataFilter={dataFilter()}
			pendingKey={pendingKey()}
			onVote={vote}
			onRemoveVote={removeVote}
		/>
	)
}

export type EntityTagsViewProps = {
	styles?: StyleXStyles
	tags: EntityTagAggregate[]
	isSignedIn: boolean
	isLoading: boolean
	dataFilter?: (tag: Tag) => boolean
	pendingKey?: string
	onVote: (tagId: number, score: EntityTagVoteValue) => Promise<void>
	onRemoveVote: (tagId: number) => Promise<void>
}

export function EntityTagsView(props: EntityTagsViewProps) {
	const { t } = useLingui()
	const tags = createMemo(() => {
		const primaryTags: EntityTagAggregate[] = []
		const secondaryTags: EntityTagAggregate[] = []

		for (const tag of props.tags) {
			if (tag.relevance > PRIMARY_TAG_RELEVANCE_THRESHOLD) {
				primaryTags.push(tag)
			} else {
				secondaryTags.push(tag)
			}
		}

		return { primaryTags, secondaryTags }
	})
	const primaryTags = () => tags().primaryTags
	const secondaryTags = () => tags().secondaryTags

	return (
		<div {...stylex.attrs(styles.root, props.styles)}>
			<div {...stylex.attrs(styles.heading)}>{t`Tags`}</div>
			<Switch>
				<Match when={props.isLoading}>
					<div>
						<span {...stylex.attrs(styles.status)}>{t`Loading...`}</span>
					</div>
				</Match>
				<Match when={props.tags.length === 0}>
					<div>
						<span {...stylex.attrs(styles.status)}>{t`No tags yet`}</span>
					</div>
				</Match>
				<Match when={props.tags.length > 0}>
					<div {...stylex.attrs(styles.tagLists)}>
						<Show when={primaryTags().length > 0}>
							<div {...stylex.attrs(styles.primaryTags)}>
								<Intersperse
									of={primaryTags()}
									with=", "
								>
									{(tag) => (
										<Link
											class={stylex.attrs(link.base, link.text).class}
											to="/tag/$id"
											params={{ id: tag.id.toString() }}
										>
											{tag.name}
										</Link>
									)}
								</Intersperse>
							</div>
						</Show>

						<Show when={secondaryTags().length > 0}>
							<div
								{...stylex.attrs(
									primaryTags().length > 0
										? styles.secondaryWithPrimary
										: styles.secondaryOnly,
									styles.secondaryTags,
								)}
							>
								<Intersperse
									of={secondaryTags()}
									with=", "
								>
									{(tag) => (
										<Link
											to="/tag/$id"
											params={{ id: tag.id.toString() }}
											class={
												stylex.attrs(link.base, link.text, styles.secondaryTags)
													.class
											}
										>
											{tag.name}
										</Link>
									)}
								</Intersperse>
							</div>
						</Show>
					</div>
				</Match>
			</Switch>
			<Show when={!props.isLoading && props.isSignedIn}>
				<ManageTagsDialog
					tags={props.tags}
					isSignedIn={props.isSignedIn}
					dataFilter={props.dataFilter}
					pendingKey={props.pendingKey}
					onVote={props.onVote}
					onRemoveVote={props.onRemoveVote}
					trigger={
						<Dialog.Trigger
							as={Button}
							appearance="ghost"
							tone="gray"
							styles={styles.trigger}
						>
							{props.tags.length ? <Pencil1Icon /> : <PlusIcon />}
						</Dialog.Trigger>
					}
				/>
			</Show>
		</div>
	)
}

function ManageTagsDialog(props: ManageTagsDialogProps) {
	const { t } = useLingui()
	return (
		<Dialog.Root>
			{props.trigger}
			<Dialog.Portal>
				<Dialog.Overlay data-blur />
				<Dialog.Content styles={styles.dialog}>
					<div {...stylex.attrs(styles.dialogHeader)}>
						<Dialog.Title styles={styles.title}>{t`Manage Tags`}</Dialog.Title>
						<div {...stylex.attrs(styles.count)}>{props.tags.length}</div>
						<div {...stylex.attrs(styles.spacer)}></div>
						<Show when={props.isSignedIn}>
							<EntityTagAddDialog
								dataFilter={props.dataFilter}
								pendingKey={props.pendingKey}
								onVote={props.onVote}
								trigger={
									<Dialog.Trigger
										as={Button}
										appearance="outline"
										tone="gray"
										size="sm"
									>
										<PlusIcon {...stylex.attrs(styles.plusIcon)} />
										{t`Add tag`}
									</Dialog.Trigger>
								}
							/>
						</Show>
						<Dialog.CloseButton
							as={Button}
							appearance="ghost"
							tone="gray"
							styles={styles.closeButton}
						>
							<Cross1Icon {...stylex.attrs(styles.plusIcon)} />
						</Dialog.CloseButton>
					</div>
					<ul {...stylex.attrs(styles.list)}>
						<For each={props.tags}>
							{(tag) => (
								<EntityTagRow
									tag={tag}
									isSignedIn={props.isSignedIn}
									pendingKey={props.pendingKey}
									onVote={props.onVote}
									onRemoveVote={props.onRemoveVote}
									styles={styles.listChild}
								/>
							)}
						</For>
					</ul>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

function EntityTagRow(props: EntityTagRowProps) {
	const { t } = useLingui()
	const votes = () => props.tag.votes ?? []
	const votePending = (value: EntityTagVoteValue) =>
		props.pendingKey === `vote:${props.tag.id}`
		&& scoreFromUserVote(props.tag.user_vote) !== value
	const isPending = () =>
		props.pendingKey === `vote:${props.tag.id}`
		|| props.pendingKey === `remove:${props.tag.id}`

	return (
		<li {...stylex.attrs(styles.item, props.styles)}>
			<div {...stylex.attrs(styles.tagSummary)}>
				<Link
					to="/tag/$id"
					params={{ id: props.tag.id.toString() }}
					class={
						stylex.attrs(
							link.base,
							link.text,
							styles.tagSummaryChild,
							styles.tagName,
						).class
					}
				>
					{props.tag.name}
				</Link>
				<Show when={props.tag.short_description}>
					<div {...stylex.attrs(styles.tagSummaryChild, styles.description)}>
						{props.tag.short_description}
					</div>
				</Show>
				<div {...stylex.attrs(styles.tagSummaryChild, styles.metadata)}>
					<div>
						<TagSummaryText
							count={props.tag.count}
							relevance={props.tag.relevance}
						/>
					</div>
				</div>
				<Show when={votes().length > 0}>
					<div {...stylex.attrs(styles.tagSummaryChild, styles.voteHistory)}>
						<For each={votes()}>
							{(vote) => (
								<div>
									<span {...stylex.attrs(styles.voteValue)}>
										{vote.user_name}
									</span>{" "}
									voted{" "}
									<span {...stylex.attrs(styles.voteValue)}>{vote.score}</span>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>
			<Show when={props.isSignedIn}>
				<div {...stylex.attrs(styles.actions)}>
					<For each={ENTITY_TAG_VOTE_OPTIONS}>
						{(option) => (
							<Button
								appearance={
									props.tag.user_vote === option.userVote
										? "surface"
										: "outline"
								}
								tone="gray"
								size="sm"
								styles={[
									styles.vote,
									votePending(option.value) && styles.pendingVote,
								]}
								disabled={isPending()}
								onClick={() => void props.onVote(props.tag.id, option.value)}
							>
								<VoteOptionLabel value={option.value} />
							</Button>
						)}
					</For>
					<Show
						when={
							props.tag.user_vote !== null && props.tag.user_vote !== undefined
						}
					>
						<Button
							appearance="ghost"
							tone="gray"
							size="sm"
							styles={styles.closeButton}
							disabled={isPending()}
							onClick={() => void props.onRemoveVote(props.tag.id)}
							title={t`Remove`}
						>
							<Cross1Icon {...stylex.attrs(styles.plusIcon)} />
						</Button>
					</Show>
				</div>
			</Show>
		</li>
	)
}

function VoteOptionLabel(props: { value: EntityTagVoteValue }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.value) {
			case "High": {
				return t`High`
			}
			case "Medium": {
				return t`Medium`
			}
			case "Low": {
				return t`Low`
			}
			case "Veto": {
				return t`Downvote`
			}
		}
	}

	return <>{label()}</>
}

function TagSummaryText(props: { count: number; relevance: number }) {
	const { t } = useLingui()

	const label = () =>
		t`${{ count: props.count }} votes · relevance ${{
			relevance: props.relevance.toFixed(2),
		}}`

	return <>{label()}</>
}
