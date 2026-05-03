import type { CorrectionComment, UserProfile } from "@thc/api"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { twJoin } from "tailwind-merge"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { Avatar } from "~/component/atomic/avatar"
import { Button } from "~/component/atomic/button"

function formatDate(isoString: string): string {
	return new Date(isoString).toLocaleDateString()
}

function extractMessage(err: unknown): string {
	return err instanceof Error ? err.message : "Something went wrong"
}

const TEXTAREA_CLASS =
	"block w-full resize-none rounded border border-slate-300 bg-primary px-3 py-2 text-sm outline-1 outline-transparent -outline-offset-1 focus:outline-reimu-600 disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-100"

function makeReplyHandler(
	onCreateComment: (content: string, parentId: number | null) => Promise<void>,
	commentId: number,
	onClose: () => void,
): (content: string) => Promise<void> {
	return async (content) => {
		await onCreateComment(content, commentId)
		onClose()
	}
}

type ReplyInputProps = {
	onSubmit: (content: string) => Promise<void>
	onCancel: () => void
}

function ReplyInput(props: ReplyInputProps) {
	const [content, setContent] = createSignal("")
	const [submitting, setSubmitting] = createSignal(false)
	const [error, setError] = createSignal<string | null>(null)

	const submit = async () => {
		const text = content().trim()
		if (!text) return
		setSubmitting(true)
		setError(null)
		try {
			await props.onSubmit(text)
		} catch (err) {
			setError(extractMessage(err))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div class="mt-2 space-y-2">
			<textarea
				class={TEXTAREA_CLASS}
				value={content()}
				onInput={(e) => setContent(e.currentTarget.value)}
				disabled={submitting()}
				rows={3}
				placeholder="Write a reply..."
			></textarea>
			<Show when={error()}>
				<p class="text-xs text-reimu-600">{error()}</p>
			</Show>
			<div class="flex gap-2">
				<Button
					size="Sm"
					variant="Primary"
					disabled={submitting() || !content().trim()}
					onClick={() => void submit()}
				>
					{submitting() ? "Submitting..." : "Reply"}
				</Button>
				<Button
					size="Sm"
					variant="Tertiary"
					disabled={submitting()}
					onClick={props.onCancel}
				>
					Cancel
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
	return (
		<li class="py-4">
			<div class={twJoin("flex gap-3", props.indented && "ml-11")}>
				<Avatar
					user={props.comment.author as unknown as UserProfile}
					class="mt-0.5 shrink-0"
				/>
				<div class="min-w-0 flex-1 space-y-2">
					<Switch>
						<Match when={props.comment.state === "Deleted"}>
							<div class="py-1 text-sm text-slate-400 italic">[deleted]</div>
						</Match>
						<Match when={true}>
							<div class="space-y-1">
								<div class="flex flex-wrap items-baseline gap-2">
									<span class="text-sm font-semibold text-primary">
										{props.comment.author.name}
									</span>
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
										Reply
									</button>
								</Show>
								<Show when={props.canDelete}>
									<button
										class="text-xs font-medium text-tertiary transition-colors hover:text-reimu-600"
										onClick={() => props.onDelete()}
									>
										Delete
									</button>
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

type TopLevelInputProps = {
	onSubmit: (content: string) => Promise<void>
	currentUser: UserProfile | undefined
}

function TopLevelInput(props: TopLevelInputProps) {
	const [content, setContent] = createSignal("")
	const [submitting, setSubmitting] = createSignal(false)
	const [error, setError] = createSignal<string | null>(null)

	const submit = async () => {
		const text = content().trim()
		if (!text) return
		setSubmitting(true)
		setError(null)
		try {
			await props.onSubmit(text)
			setContent("")
		} catch (err) {
			setError(extractMessage(err))
		} finally {
			setSubmitting(false)
		}
	}

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
					value={content()}
					onInput={(e) => setContent(e.currentTarget.value)}
					disabled={submitting()}
					rows={3}
					placeholder="Add a comment..."
				></textarea>
				<Show when={error()}>
					<p class="text-xs text-reimu-600">{error()}</p>
				</Show>
				<div class="flex justify-end">
					<Button
						size="Sm"
						variant="Primary"
						disabled={submitting() || !content().trim()}
						onClick={() => void submit()}
					>
						{submitting() ? "Submitting..." : "Comment"}
					</Button>
				</div>
			</div>
		</div>
	)
}

export type CorrectionCommentsProps = {
	comments: CorrectionComment[]
	nextCursor: number | null | undefined
	isLoadingMore: boolean
	currentUser: UserProfile | undefined
	canManage: boolean
	onLoadMore: () => void
	onCreateComment: (content: string, parentId: number | null) => Promise<void>
	onDeleteComment: (commentId: number) => Promise<void>
}

export function CorrectionComments(props: CorrectionCommentsProps) {
	const [activeReplyId, setActiveReplyId] = createSignal<number | null>(null)

	const commentMap = createMemo(
		() => new Map(props.comments.map((c) => [c.id, c])),
	)

	const getRootId = (c: CorrectionComment) => {
		let curr = c
		const map = commentMap()
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
		<Card class="overflow-hidden border border-slate-200 p-0 shadow-xs">
			<div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
				<span class="text-xs font-medium tracking-wider text-slate-600 uppercase">
					Comments
				</span>
				<span class="font-mono text-xs text-slate-400">
					{props.comments.length}
				</span>
			</div>

			<Switch>
				<Match when={props.comments.length === 0 && !props.isLoadingMore}>
					<div class="px-4 py-6 text-sm text-tertiary">No comments yet.</div>
				</Match>
				<Match when={props.comments.length > 0}>
					<ul class="divide-y divide-slate-100 px-4">
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
										onSubmitReply={makeReplyHandler(
											props.onCreateComment,
											comment.id,
											() => setActiveReplyId(null),
										)}
									/>
									<For each={repliesFor(comment.id)}>
										{(reply) => {
											const replyToName =
												reply.parent_id === comment.id
													? undefined
													: commentMap().get(reply.parent_id!)?.author.name

											return (
												<CommentItem
													comment={reply}
													currentUser={props.currentUser}
													canDelete={canDelete(reply)}
													isReplyOpen={activeReplyId() === reply.id}
													onReply={() => setActiveReplyId(reply.id)}
													onCancelReply={() => setActiveReplyId(null)}
													onDelete={() => void props.onDeleteComment(reply.id)}
													onSubmitReply={makeReplyHandler(
														props.onCreateComment,
														reply.id,
														() => setActiveReplyId(null),
													)}
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

			<Show when={props.nextCursor != null}>
				<div class="flex justify-center border-t border-slate-100 px-4 py-3">
					<Button
						variant="Secondary"
						size="Sm"
						disabled={props.isLoadingMore}
						onClick={props.onLoadMore}
					>
						{props.isLoadingMore ? "Loading..." : "Load more"}
					</Button>
				</div>
			</Show>

			<div class="border-t border-slate-200 p-4">
				<Show
					when={props.currentUser !== undefined}
					fallback={
						<p class="text-sm text-tertiary">
							<Link
								to="/auth"
								search={{ type: "sign_in" }}
							>
								Sign in
							</Link>{" "}
							to comment
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
