import { Trans, useLingui } from "@lingui/solid/macro"
import { useMutation } from "@tanstack/solid-query"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import type { Accessor, JSX } from "solid-js"
import { twJoin } from "tailwind-merge"

import { Link } from "~/component/atomic/Link"
import { Avatar } from "~/component/atomic/avatar"
import { Button } from "~/component/atomic/button"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import type { Comment, UserProfile } from "~/hey-api"

import type { EntityCommentsController } from "./EntityCommentsController"

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

const TEXTAREA_CLASS =
	"block w-full resize-none rounded border border-slate-300 bg-primary px-3 py-2 text-sm outline-1 outline-transparent -outline-offset-1 focus:outline-reimu-600 disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-100"

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
	actionClass: string
	onCancel?: () => void
	class?: string
}

function CommentInput(props: CommentInputProps) {
	const input = useCommentInputStore({
		onSubmit: (content) => props.onSubmit(content),
	})

	return (
		<div class={props.class}>
			<textarea
				class={TEXTAREA_CLASS}
				value={input.content()}
				aria-label={props.placeholder}
				onInput={(e) => input.setContent(e.currentTarget.value)}
				disabled={input.isSubmitting()}
				rows={3}
				placeholder={props.placeholder}
			></textarea>
			<Show when={input.errorMessage()}>
				{(message) => <p class="text-xs text-reimu-600">{message()}</p>}
			</Show>
			<div class={props.actionClass}>
				<Button
					size="Sm"
					variant="Primary"
					disabled={input.isSubmitting()}
					onClick={input.submit}
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
							size="Sm"
							variant="Tertiary"
							disabled={input.isSubmitting()}
							onClick={onCancel()}
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
	onSubmit: (content: string) => Promise<void>
	onCancel: () => void
}) {
	const { t } = useLingui()

	return (
		<CommentInput
			class="mt-2 space-y-2"
			actionClass="flex gap-2"
			placeholder={t`Write a reply...`}
			submitText={<Trans>Reply</Trans>}
			onSubmit={props.onSubmit}
			onCancel={props.onCancel}
		/>
	)
}

type CommentItemProps = {
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
		<li class="py-4">
			<div class={twJoin("flex gap-3", props.indented && "ml-11")}>
				<Avatar
					user={props.comment.author}
					class="mt-0.5 shrink-0"
				/>
				<div class="min-w-0 flex-1 space-y-2">
					<Show
						when={props.comment.state === "Deleted"}
						fallback={
							<>
								<div class="space-y-1">
									<div class="flex flex-wrap items-baseline gap-2">
										<Link
											to="/profile/$username"
											params={{ username: props.comment.author.name }}
											class="text-sm font-semibold"
										>
											{props.comment.author.name}
										</Link>
										<Show when={props.replyToName}>
											<span class="text-xs font-medium text-slate-400">
												▶ {props.replyToName}
											</span>
										</Show>
										<span class="text-xs text-tertiary">
											{formatDate(props.comment.created_at)}
										</span>
									</div>
									<p class="text-sm text-secondary wrap-break-word">
										{props.comment.content}
									</p>
								</div>
								<div class="flex items-center gap-3">
									<Show when={props.currentUser !== undefined}>
										<button
											class="text-xs font-medium text-tertiary transition-colors hover:text-primary"
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
													class="text-xs font-medium text-tertiary transition-colors hover:text-reimu-600"
												>
													{t`Delete`}
												</button>
											)}
										/>
									</Show>
								</div>
								<Show when={deleteMutation.isError}>
									<p class="text-xs text-reimu-600">{deleteErrorMessage()}</p>
								</Show>
								<Show when={props.isReplyOpen}>
									<ReplyInput
										onSubmit={props.onSubmitReply}
										onCancel={props.onCancelReply}
									/>
								</Show>
							</>
						}
					>
						<div class="py-1 text-sm text-slate-400 italic">{t`[deleted]`}</div>
					</Show>
				</div>
			</div>
		</li>
	)
}

type CommentThreadListItemProps = {
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
		<div class="flex gap-3">
			<Show when={props.currentUser}>
				<Avatar
					user={props.currentUser}
					class="mt-0.5 shrink-0"
				/>
			</Show>
			<CommentInput
				class="min-w-0 flex-1 space-y-2"
				actionClass="flex justify-end"
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

type CommentThreadListProps = {
	controller: EntityCommentsController
	emptyText: JSX.Element
	listClass: string
	statusClass: string
	loadMoreClass: string
}

export function CommentThreadList(props: CommentThreadListProps) {
	const { t } = useLingui()
	const [activeReplyId, setActiveReplyId] = createSignal<number | null>(null)
	const closeActiveReplyIfStillOpen = (commentId: number) => {
		setActiveReplyId((activeId) => (activeId === commentId ? null : activeId))
	}

	const commentGroups = createMemo(() => {
		const nodeById = new Map<number, CommentRenderNode>()
		const rootNodes: CommentRenderNode[] = []

		for (const comment of props.controller.comments()) {
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
				<Match when={props.controller.isInitialLoading()}>
					<div class={props.statusClass}>{t`Loading comments...`}</div>
				</Match>
				<Match
					when={
						props.controller.errorMessage()
						&& props.controller.comments().length === 0
					}
				>
					{(message) => <div class={props.statusClass}>{message()}</div>}
				</Match>
				<Match when={commentGroups().length === 0}>
					<div class={props.statusClass}>{props.emptyText}</div>
				</Match>
				<Match when={commentGroups().length > 0}>
					<>
						<Show when={props.controller.errorMessage()}>
							{(message) => <div class={props.statusClass}>{message()}</div>}
						</Show>
						<ul class={props.listClass}>
							<For each={commentGroups()}>
								{(root) => (
									<>
										<CommentThreadListItem
											comment={root.comment}
											currentUser={props.controller.currentUser()}
											canManage={props.controller.canManage()}
											activeReplyId={activeReplyId}
											onReply={setActiveReplyId}
											onCancelReply={() => setActiveReplyId(null)}
											onCreateComment={props.controller.createComment}
											onDeleteComment={props.controller.deleteComment}
											onReplySubmitted={closeActiveReplyIfStillOpen}
										/>
										<For each={root.replies}>
											{(reply) => (
												<CommentThreadListItem
													comment={reply.comment}
													currentUser={props.controller.currentUser()}
													canManage={props.controller.canManage()}
													activeReplyId={activeReplyId}
													onReply={setActiveReplyId}
													onCancelReply={() => setActiveReplyId(null)}
													onCreateComment={props.controller.createComment}
													onDeleteComment={props.controller.deleteComment}
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

			<Show when={props.controller.hasMore()}>
				<div class={props.loadMoreClass}>
					<Button
						variant="Secondary"
						size="Sm"
						disabled={props.controller.isLoadingMore()}
						onClick={() => {
							void props.controller.loadMore()
						}}
					>
						{props.controller.isLoadingMore() ? t`Loading...` : t`Load more`}
					</Button>
				</div>
			</Show>
		</>
	)
}
