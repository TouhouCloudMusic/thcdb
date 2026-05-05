import { Trans, useLingui } from "@lingui/solid/macro"
import { useMutation } from "@tanstack/solid-query"
import type { CorrectionComment, UserProfile } from "@thc/api"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { twJoin } from "tailwind-merge"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { Avatar } from "~/component/atomic/avatar"
import { Button } from "~/component/atomic/button"
import { AlertDialog } from "~/component/dialog/AlertDialog"

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

function ReplyInput(props: {
	onSubmit: (content: string) => Promise<void>
	onCancel: () => void
}) {
	const { t } = useLingui()
	const input = useCommentInputStore({
		onSubmit: (content) => props.onSubmit(content),
	})

	return (
		<div class="mt-2 space-y-2">
			<textarea
				class={TEXTAREA_CLASS}
				value={input.content()}
				onInput={(e) => input.setContent(e.currentTarget.value)}
				disabled={input.isSubmitting()}
				rows={3}
				placeholder={t`Write a reply...`}
			></textarea>
			<Show when={input.errorMessage()}>
				{(message) => <p class="text-xs text-reimu-600">{message()}</p>}
			</Show>
			<div class="flex gap-2">
				<Button
					size="Sm"
					variant="Primary"
					disabled={input.isSubmitting()}
					onClick={input.submit}
				>
					<Show
						when={input.isSubmitting()}
						fallback={<Trans>Reply</Trans>}
					>
						<Trans>Submitting...</Trans>
					</Show>
				</Button>
				<Button
					size="Sm"
					variant="Tertiary"
					disabled={input.isSubmitting()}
					onClick={props.onCancel}
				>
					<Trans>Cancel</Trans>
				</Button>
			</div>
		</div>
	)
}

type CommentItemProps = {
	comment: CorrectionComment
	currentUser: UserProfile | undefined
	canDelete: boolean
	isReplyOpen: boolean
	onReply: () => void
	onCancelReply: () => void
	onDelete: () => void
	onSubmitReply: (content: string) => Promise<void>
	indented?: boolean
	replyToName?: string
}

function CommentItem(props: CommentItemProps) {
	const { t } = useLingui()
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = createSignal(false)

	return (
		<li class="py-4">
			<div class={twJoin("flex gap-3", props.indented && "ml-11")}>
				<Avatar
					user={props.comment.author}
					class="mt-0.5 shrink-0"
				/>
				<div class="min-w-0 flex-1 space-y-2">
					<Switch>
						<Match when={props.comment.state === "Deleted"}>
							<div class="py-1 text-sm text-slate-400 italic">
								{t`[deleted]`}
							</div>
						</Match>
						<Match when={true}>
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
											props.onDelete()
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
						</Match>
					</Switch>
					<Show when={props.isReplyOpen}>
						<ReplyInput
							onSubmit={props.onSubmitReply}
							onCancel={props.onCancelReply}
						/>
					</Show>
				</div>
			</div>
		</li>
	)
}

function TopLevelInput(props: {
	onSubmit: (content: string) => Promise<void>
	currentUser: UserProfile | undefined
}) {
	const { t } = useLingui()
	const input = useCommentInputStore({
		onSubmit: (content) => props.onSubmit(content),
	})

	return (
		<div class="flex gap-3">
			<Show when={props.currentUser}>
				<Avatar
					user={props.currentUser}
					class="mt-0.5 shrink-0"
				/>
			</Show>
			<div class="min-w-0 flex-1 space-y-2">
				<textarea
					class={TEXTAREA_CLASS}
					value={input.content()}
					onInput={(e) => input.setContent(e.currentTarget.value)}
					disabled={input.isSubmitting()}
					rows={3}
					placeholder={t`Add a comment...`}
				></textarea>
				<Show when={input.errorMessage()}>
					{(message) => <p class="text-xs text-reimu-600">{message()}</p>}
				</Show>
				<div class="flex justify-end">
					<Button
						size="Sm"
						variant="Primary"
						disabled={input.isSubmitting()}
						onClick={input.submit}
					>
						<Show
							when={input.isSubmitting()}
							fallback={<Trans>Comment</Trans>}
						>
							<Trans>Submitting...</Trans>
						</Show>
					</Button>
				</div>
			</div>
		</div>
	)
}

export type CorrectionCommentsProps = {
	correctionId: number
	comments: CorrectionComment[]
	hasMore: boolean
	isLoadingMore: boolean
	currentUser: UserProfile | undefined
	canManage: boolean
	onLoadMore: () => void
	onCreateComment: (content: string, parentId: number | null) => Promise<void>
	onDeleteComment: (commentId: number) => Promise<void>
}

export function CorrectionComments(props: CorrectionCommentsProps) {
	const { t } = useLingui()
	const [activeReplyId, setActiveReplyId] = createSignal<number | null>(null)
	const commentById = createMemo(
		() => new Map(props.comments.map((c) => [c.id, c])),
	)
	const closeActiveReplyIfStillOpen = (commentId: number) => {
		setActiveReplyId((activeId) => (activeId === commentId ? null : activeId))
	}

	const getRootId = (comment: CorrectionComment) => {
		let curr = comment
		const map = commentById()
		while (curr.parent_id != null) {
			const parent = map.get(curr.parent_id)
			if (!parent) break
			curr = parent
		}
		return curr.id
	}

	const rootComments = () => props.comments.filter((c) => c.parent_id == null)
	const repliesFor = (rootId: number) =>
		props.comments.filter((c) => c.parent_id != null && getRootId(c) === rootId)

	const canDelete = (comment: CorrectionComment) =>
		comment.state === "Active"
		&& (props.currentUser?.name === comment.author.name || props.canManage)

	return (
		<Card class="overflow-hidden border border-slate-300 p-0 shadow-xs">
			<div class="flex items-center justify-between border-b border-slate-300 bg-slate-50 px-4 py-3">
				<span class="text-xs font-medium tracking-wider text-slate-600 uppercase">
					{t`Comments`}
				</span>
				<span class="font-mono text-xs text-slate-400">
					{props.comments.length}
				</span>
			</div>

			<Switch>
				<Match when={props.comments.length === 0 && !props.isLoadingMore}>
					<div class="px-4 py-6 text-sm text-tertiary">
						{t`No comments yet.`}
					</div>
				</Match>
				<Match when={props.comments.length > 0}>
					<ul class="divide-y divide-slate-200 px-4">
						<For each={rootComments()}>
							{(comment) => (
								<>
									<CommentItem
										comment={comment}
										currentUser={props.currentUser}
										canDelete={canDelete(comment)}
										isReplyOpen={activeReplyId() === comment.id}
										onReply={() => setActiveReplyId(comment.id)}
										onCancelReply={() => setActiveReplyId(null)}
										onDelete={() => void props.onDeleteComment(comment.id)}
										onSubmitReply={(content) => {
											const commentId = comment.id
											return props
												.onCreateComment(content, commentId)
												.then(() => closeActiveReplyIfStillOpen(commentId))
										}}
									/>
									<For each={repliesFor(comment.id)}>
										{(reply) => {
											const replyToName =
												reply.parent_id === comment.id
													? undefined
													: commentById().get(reply.parent_id!)?.author.name

											return (
												<CommentItem
													comment={reply}
													currentUser={props.currentUser}
													canDelete={canDelete(reply)}
													isReplyOpen={activeReplyId() === reply.id}
													onReply={() => setActiveReplyId(reply.id)}
													onCancelReply={() => setActiveReplyId(null)}
													onDelete={() => void props.onDeleteComment(reply.id)}
													onSubmitReply={(content) => {
														const commentId = reply.id
														return props
															.onCreateComment(content, commentId)
															.then(() =>
																closeActiveReplyIfStillOpen(commentId),
															)
													}}
													indented
													replyToName={replyToName}
												/>
											)
										}}
									</For>
								</>
							)}
						</For>
					</ul>
				</Match>
			</Switch>

			<Show when={props.hasMore}>
				<div class="flex justify-center border-t border-slate-200 px-4 py-3">
					<Button
						variant="Secondary"
						size="Sm"
						disabled={props.isLoadingMore}
						onClick={props.onLoadMore}
					>
						{props.isLoadingMore ? t`Loading...` : t`Load more`}
					</Button>
				</div>
			</Show>

			<div class="border-t border-slate-300 p-4">
				<Show
					when={props.currentUser !== undefined}
					fallback={
						<p class="text-sm text-tertiary">
							<Link
								to="/auth"
								search={{ type: "sign_in" }}
							>
								{t`Sign in`}
							</Link>{" "}
							{t`to comment`}
						</p>
					}
				>
					<TopLevelInput
						onSubmit={(content) => props.onCreateComment(content, null)}
						currentUser={props.currentUser}
					/>
				</Show>
			</div>
		</Card>
	)
}
