import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { useMutation } from "@tanstack/solid-query"
import { Link } from "@tanstack/solid-router"
import {
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Suspense,
	Switch,
} from "solid-js"
import type { Accessor, JSX } from "solid-js"

import { Avatar } from "~/component/atomic/avatar"
import { Button } from "~/component/atomic/button"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import type { Comment, UserProfile } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

const styles = stylex.create({
	inputChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	bodyChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	messageChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[4] },
	},
	textarea: {
		display: "block",
		width: "100%",
		resize: "none",
		borderRadius: radius.sm,
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: {
			default: colors.backgroundPrimary,
			":disabled": palette.slate[100],
		},
		paddingLeft: px[12],
		paddingRight: px[12],
		paddingTop: px[8],
		paddingBottom: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		outlineWidth: "1px",
		outlineStyle: "solid",
		outlineColor: { default: "transparent", ":focus": palette.reimu[600] },
		outlineOffset: "-1px",
		color: { default: null, ":disabled": palette.slate[400] },
		transitionProperty: "all",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "100ms",
	},
	inputError: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.reimu[600],
	},
	replyInput: { marginTop: px[8] },
	replyActions: { display: "flex", gap: px[8] },
	item: { paddingTop: px[16], paddingBottom: px[16] },
	comment: { display: "flex", gap: px[12] },
	indented: { marginLeft: px[44] },
	avatar: { marginTop: px[2], flexShrink: 0 },
	body: { minWidth: 0, flex: "1" },
	metadata: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "baseline",
		gap: px[8],
	},
	author: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 600,
	},
	replyTarget: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: palette.slate[400],
	},
	timestamp: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	commentText: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
		overflowWrap: "break-word",
	},
	actions: { display: "flex", alignItems: "center", gap: px[12] },
	replyAction: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: {
			default: colors.textTertiary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
		},
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
	},
	deleteAction: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: {
			default: colors.textTertiary,
			":hover": { default: null, "@media (hover: hover)": palette.reimu[600] },
		},
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
	},
	deletedMessage: {
		paddingTop: px[4],
		paddingBottom: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[400],
		fontStyle: "italic",
	},
	composerActions: { display: "flex", justifyContent: "flex-end" },
})

type CommentRenderNode = {
	comment: Comment
	replies: CommentRenderNode[]
}

type CommentRenderReply = {
	comment: Comment
	replyToName?: string
}

type CommentRenderGroup = {
	comment: Comment
	replies: CommentRenderReply[]
}

function CommentRenderNode_shouldRender(node: CommentRenderNode): boolean {
	if (node.comment.state !== "Deleted") return true
	return node.replies.some(CommentRenderNode_shouldRender)
}

function CommentRenderNode_flattenReplies(
	node: CommentRenderNode,
): CommentRenderReply[] {
	const replies: CommentRenderReply[] = []
	for (const reply of node.replies) {
		if (!CommentRenderNode_shouldRender(reply)) continue
		replies.push({
			comment: reply.comment,
			replyToName:
				node.comment.in_reply_to_comment_id == null
					? undefined
					: node.comment.author.name,
		})
		replies.push(...CommentRenderNode_flattenReplies(reply))
	}
	return replies
}

function CommentRenderNode_toRenderGroup(
	node: CommentRenderNode,
): CommentRenderGroup {
	return {
		comment: node.comment,
		replies: CommentRenderNode_flattenReplies(node),
	}
}

function formatDate(isoString: string): string {
	return new Date(isoString).toLocaleDateString()
}

function useCommentInputStore(options: {
	onSubmit: (content: string) => Promise<void>
}) {
	const { t } = useLingui()
	const [content, setContent] = createSignal("")
	const [validationError, setValidationError] = createSignal<string>()
	const submitMutation = useMutation(() => ({
		mutationFn: options.onSubmit,
		onSuccess: () => {
			setContent("")
		},
	}))

	const mutationErrorMessage = () => {
		const message = submitMutation.error?.message
		return message && message.length > 0 ? message : undefined
	}
	const errorMessage = () => {
		if (validationError()) return validationError()
		if (!submitMutation.error) return undefined
		return mutationErrorMessage() ?? t`Something went wrong`
	}
	const setInputContent = (value: string) => {
		setContent(value)
		if (value.trim()) setValidationError(undefined)
	}
	const submit = () => {
		const text = content().trim()
		if (!text) {
			setValidationError(t`Comment cannot be empty`)
			return
		}
		setValidationError(undefined)
		submitMutation.mutate(text)
	}

	return {
		content,
		errorMessage,
		isSubmitting: () => submitMutation.isPending,
		setContent: setInputContent,
		submit,
	}
}

type CommentInputProps = {
	onSubmit: (content: string) => Promise<void>
	placeholder: string
	submitText: JSX.Element
	actionStyles: StyleXStyles
	onCancel?: () => void
	styles?: StyleXStyles
}

function CommentInput(props: CommentInputProps) {
	const input = useCommentInputStore({
		onSubmit: (content) => props.onSubmit(content),
	})

	return (
		<div {...stylex.attrs(props.styles)}>
			<textarea
				{...stylex.attrs(styles.inputChild, styles.textarea)}
				value={input.content()}
				aria-label={props.placeholder}
				onInput={(e) => input.setContent(e.currentTarget.value)}
				disabled={input.isSubmitting()}
				rows={3}
				placeholder={props.placeholder}
			></textarea>
			<Show when={input.errorMessage()}>
				{(message) => (
					<p {...stylex.attrs(styles.inputChild, styles.inputError)}>
						{message()}
					</p>
				)}
			</Show>
			<div {...stylex.attrs(props.actionStyles, styles.inputChild)}>
				<Button
					disabled={input.isSubmitting()}
					onClick={input.submit}
					appearance="solid"
					tone="gray"
					size="sm"
				>
					<Show
						when={input.isSubmitting()}
						fallback={props.submitText}
					>
						<Trans>Submitting...</Trans>
					</Show>
				</Button>
				<Show when={props.onCancel}>
					{(onCancel) => (
						<Button
							disabled={input.isSubmitting()}
							onClick={onCancel()}
							appearance="ghost"
							tone="gray"
							size="sm"
						>
							<Trans>Cancel</Trans>
						</Button>
					)}
				</Show>
			</div>
		</div>
	)
}

function ReplyInput(props: {
	styles?: StyleXStyles
	onSubmit: (content: string) => Promise<void>
	onCancel: () => void
}) {
	const { t } = useLingui()

	return (
		<CommentInput
			styles={[styles.replyInput, props.styles]}
			actionStyles={styles.replyActions}
			placeholder={t`Write a reply...`}
			submitText={<Trans>Reply</Trans>}
			onSubmit={props.onSubmit}
			onCancel={props.onCancel}
		/>
	)
}

type CommentItemProps = {
	styles?: StyleXStyles
	comment: Comment
	currentUser: UserProfile | undefined
	canDelete: boolean
	isReplyOpen: boolean
	onReply: () => void
	onCancelReply: () => void
	onDelete: () => Promise<void>
	onSubmitReply: (content: string) => Promise<void>
	indented?: boolean
	replyToName?: string
}

function CommentItem(props: CommentItemProps) {
	const { t } = useLingui()
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = createSignal(false)
	const deleteMutation = useMutation(() => ({
		mutationFn: () => props.onDelete(),
	}))
	const deleteErrorMessage = () => {
		const message = deleteMutation.error?.message
		return message && message.length > 0 ? message : t`Failed to delete comment`
	}

	return (
		<li {...stylex.attrs(styles.item, props.styles)}>
			<div {...stylex.attrs(styles.comment, props.indented && styles.indented)}>
				<Avatar
					user={props.comment.author}
					styles={styles.avatar}
				/>
				<div {...stylex.attrs(styles.body)}>
					<Show
						when={props.comment.state === "Deleted"}
						fallback={
							<>
								<div {...stylex.attrs(styles.bodyChild)}>
									<div {...stylex.attrs(styles.messageChild, styles.metadata)}>
										<Link
											to="/profile/$username"
											params={{ username: props.comment.author.name }}
											class={
												stylex.attrs(link.base, link.text, styles.author).class
											}
										>
											{props.comment.author.name}
										</Link>
										<Show when={props.replyToName}>
											<span {...stylex.attrs(styles.replyTarget)}>
												▶ {props.replyToName}
											</span>
										</Show>
										<span {...stylex.attrs(styles.timestamp)}>
											{formatDate(props.comment.created_at)}
										</span>
									</div>
									<p {...stylex.attrs(styles.messageChild, styles.commentText)}>
										{props.comment.content}
									</p>
								</div>
								<div {...stylex.attrs(styles.bodyChild, styles.actions)}>
									<Show when={props.currentUser !== undefined}>
										<button
											{...stylex.attrs(styles.replyAction)}
											onClick={() => props.onReply()}
										>
											{t`Reply`}
										</button>
									</Show>
									<Show when={props.canDelete}>
										<AlertDialog
											open={isDeleteDialogOpen()}
											onOpenChange={setIsDeleteDialogOpen}
											title={t`Delete comment`}
											description={t`Are you sure you want to delete this comment?`}
											confirmText={t`Delete`}
											onCancel={() => setIsDeleteDialogOpen(false)}
											onConfirm={() => {
												setIsDeleteDialogOpen(false)
												deleteMutation.mutate()
											}}
											triggerAs={(triggerProps) => (
												<button
													{...triggerProps}
													{...stylex.attrs(styles.deleteAction)}
												>
													{t`Delete`}
												</button>
											)}
										/>
									</Show>
								</div>
								<Show when={deleteMutation.isError}>
									<p {...stylex.attrs(styles.bodyChild, styles.inputError)}>
										{deleteErrorMessage()}
									</p>
								</Show>
								<Show when={props.isReplyOpen}>
									<ReplyInput
										onSubmit={props.onSubmitReply}
										onCancel={props.onCancelReply}
										styles={styles.bodyChild}
									/>
								</Show>
							</>
						}
					>
						<div
							{...stylex.attrs(styles.bodyChild, styles.deletedMessage)}
						>{t`[deleted]`}</div>
					</Show>
				</div>
			</div>
		</li>
	)
}

type CommentThreadListItemProps = {
	styles?: StyleXStyles
	comment: Comment
	currentUser: UserProfile | undefined
	canManage: boolean
	activeReplyId: Accessor<number | null>
	onReply: (commentId: number) => void
	onCancelReply: () => void
	onCreateComment: (
		content: string,
		inReplyToCommentId: number | null,
	) => Promise<void>
	onDeleteComment: (commentId: number) => Promise<void>
	onReplySubmitted: (commentId: number) => void
	indented?: boolean
	replyToName?: string
}

function CommentThreadListItem(props: CommentThreadListItemProps) {
	const commentId = () => props.comment.id
	const canDelete = () =>
		props.comment.state === "Active"
		&& (props.currentUser?.name === props.comment.author.name
			|| props.canManage)

	return (
		<CommentItem
			styles={props.styles}
			comment={props.comment}
			currentUser={props.currentUser}
			canDelete={canDelete()}
			isReplyOpen={
				props.comment.state === "Active"
				&& props.activeReplyId() === commentId()
			}
			onReply={() => props.onReply(commentId())}
			onCancelReply={props.onCancelReply}
			onDelete={() => props.onDeleteComment(commentId())}
			onSubmitReply={(content) => {
				const id = commentId()
				const onReplySubmitted = props.onReplySubmitted
				return props
					.onCreateComment(content, id)
					.then(() => onReplySubmitted(id))
			}}
			indented={props.indented}
			replyToName={props.replyToName}
		/>
	)
}

function TopLevelInput(props: {
	onSubmit: (content: string) => Promise<void>
	currentUser: UserProfile | undefined
}) {
	const { t } = useLingui()

	return (
		<div {...stylex.attrs(styles.comment)}>
			<Show when={props.currentUser}>
				<Avatar
					user={props.currentUser}
					styles={styles.avatar}
				/>
			</Show>
			<CommentInput
				styles={styles.body}
				actionStyles={styles.composerActions}
				placeholder={t`Add a comment...`}
				submitText={<Trans>Comment</Trans>}
				onSubmit={props.onSubmit}
			/>
		</div>
	)
}

type CommentComposerProps = {
	onSubmit: (content: string) => Promise<void>
	currentUser: UserProfile | undefined
	signedOutFallback: JSX.Element
}

export function CommentComposer(props: CommentComposerProps) {
	return (
		<Show
			when={props.currentUser !== undefined}
			fallback={props.signedOutFallback}
		>
			<TopLevelInput
				onSubmit={props.onSubmit}
				currentUser={props.currentUser}
			/>
		</Show>
	)
}

export type CommentThreadModel = {
	canManage: Accessor<boolean>
	comments: Accessor<Comment[]>
	createComment: (
		content: string,
		inReplyToCommentId: number | null,
	) => Promise<void>
	deleteComment: (commentId: number) => Promise<void>
	errorMessage: Accessor<string | undefined>
	hasMore: Accessor<boolean | undefined>
	isLoadingMore: Accessor<boolean>
	loadMore: () => Promise<void>
}

type CommentThreadListProps = {
	itemStyles?: StyleXStyles
	model: CommentThreadModel
	currentUser: UserProfile | undefined
	emptyText: JSX.Element
	listStyles?: StyleXStyles
	statusStyles: StyleXStyles
	loadMoreStyles: StyleXStyles
}

export function CommentThreadList(props: CommentThreadListProps) {
	const { t } = useLingui()

	return (
		<Suspense
			fallback={
				<div
					{...stylex.attrs(props.statusStyles)}
				>{t`Loading comments...`}</div>
			}
		>
			<CommentThreadListContent
				itemStyles={props.itemStyles}
				model={props.model}
				currentUser={props.currentUser}
				emptyText={props.emptyText}
				listStyles={props.listStyles}
				statusStyles={props.statusStyles}
				loadMoreStyles={props.loadMoreStyles}
			/>
		</Suspense>
	)
}

function CommentThreadListContent(props: CommentThreadListProps) {
	const { t } = useLingui()
	const [activeReplyId, setActiveReplyId] = createSignal<number | null>(null)
	const closeActiveReplyIfStillOpen = (commentId: number) => {
		setActiveReplyId((activeId) => (activeId === commentId ? null : activeId))
	}

	const commentGroups = createMemo(() => {
		const nodeById = new Map<number, CommentRenderNode>()
		const rootNodes: CommentRenderNode[] = []

		for (const comment of props.model.comments()) {
			nodeById.set(comment.id, {
				comment,
				replies: [],
			})
		}

		for (const node of nodeById.values()) {
			const inReplyToCommentId = node.comment.in_reply_to_comment_id
			if (inReplyToCommentId == null) {
				rootNodes.push(node)
				continue
			}

			const inReplyToComment = nodeById.get(inReplyToCommentId)
			if (inReplyToComment) {
				inReplyToComment.replies.push(node)
			} else {
				rootNodes.push(node)
			}
		}

		const groups: CommentRenderGroup[] = rootNodes
			.filter(CommentRenderNode_shouldRender)
			.map(CommentRenderNode_toRenderGroup)

		return groups
	})

	return (
		<>
			<Switch>
				<Match
					when={
						commentGroups().length === 0
							? props.model.errorMessage()
							: undefined
					}
				>
					{(message) => (
						<div {...stylex.attrs(props.statusStyles)}>{message()}</div>
					)}
				</Match>
				<Match when={commentGroups().length === 0}>
					<div {...stylex.attrs(props.statusStyles)}>{props.emptyText}</div>
				</Match>
				<Match when={commentGroups().length > 0}>
					<>
						<Show when={props.model.errorMessage()}>
							{(message) => (
								<div {...stylex.attrs(props.statusStyles)}>{message()}</div>
							)}
						</Show>
						<ul {...stylex.attrs(props.listStyles)}>
							<For each={commentGroups()}>
								{(root) => (
									<>
										<CommentThreadListItem
											styles={props.itemStyles}
											comment={root.comment}
											currentUser={props.currentUser}
											canManage={props.model.canManage()}
											activeReplyId={activeReplyId}
											onReply={setActiveReplyId}
											onCancelReply={() => setActiveReplyId(null)}
											onCreateComment={props.model.createComment}
											onDeleteComment={props.model.deleteComment}
											onReplySubmitted={closeActiveReplyIfStillOpen}
										/>
										<For each={root.replies}>
											{(reply) => (
												<CommentThreadListItem
													styles={props.itemStyles}
													comment={reply.comment}
													currentUser={props.currentUser}
													canManage={props.model.canManage()}
													activeReplyId={activeReplyId}
													onReply={setActiveReplyId}
													onCancelReply={() => setActiveReplyId(null)}
													onCreateComment={props.model.createComment}
													onDeleteComment={props.model.deleteComment}
													onReplySubmitted={closeActiveReplyIfStillOpen}
													indented
													replyToName={reply.replyToName}
												/>
											)}
										</For>
									</>
								)}
							</For>
						</ul>
					</>
				</Match>
			</Switch>

			<Show when={props.model.hasMore()}>
				<div {...stylex.attrs(props.loadMoreStyles)}>
					<Button
						disabled={props.model.isLoadingMore()}
						onClick={() => {
							void props.model.loadMore()
						}}
						appearance="soft"
						tone="gray"
						size="sm"
					>
						{props.model.isLoadingMore() ? t`Loading...` : t`Load more`}
					</Button>
				</div>
			</Show>
		</>
	)
}
