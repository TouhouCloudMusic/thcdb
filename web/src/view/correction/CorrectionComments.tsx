import { useLingui } from "@lingui/solid/macro"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import type { CorrectionComment, UserProfile } from "~/hey-api"
import {
	CommentComposer,
	CommentThreadList,
} from "~/view/comment/CommentThread"

export type CorrectionCommentsProps = {
	comments: CorrectionComment[]
	hasMore: boolean
	isInitialLoading: boolean
	isLoadingMore: boolean
	errorMessage?: string
	currentUser: UserProfile | undefined
	canManage: boolean
	onLoadMore: () => void
	onCreateComment: (content: string, parentId: number | null) => Promise<void>
	onDeleteComment: (commentId: number) => Promise<void>
}

export function CorrectionComments(props: CorrectionCommentsProps) {
	const { t } = useLingui()

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

			<CommentThreadList
				comments={props.comments}
				hasMore={props.hasMore}
				isInitialLoading={props.isInitialLoading}
				isLoadingMore={props.isLoadingMore}
				errorMessage={props.errorMessage}
				currentUser={props.currentUser}
				canManage={props.canManage}
				emptyText={t`No comments yet.`}
				listClass="divide-y divide-slate-200 px-4"
				statusClass="px-4 py-6 text-sm text-tertiary"
				loadMoreClass="flex justify-center border-t border-slate-200 px-4 py-3"
				onLoadMore={props.onLoadMore}
				onCreateComment={props.onCreateComment}
				onDeleteComment={props.onDeleteComment}
			/>

			<div class="border-t border-slate-300 p-4">
				<CommentComposer
					onSubmit={(content) => props.onCreateComment(content, null)}
					currentUser={props.currentUser}
					signedOutFallback={
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
				/>
			</div>
		</Card>
	)
}
