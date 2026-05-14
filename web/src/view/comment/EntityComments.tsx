import { useLingui } from "@lingui/solid/macro"

import { Link } from "~/component/atomic/Link"

import { CommentComposer, CommentThreadList } from "./CommentThread"
import type { EntityCommentsController } from "./EntityCommentsController"

export type EntityCommentsProps = {
	controller: EntityCommentsController
}

export function EntityComments(props: EntityCommentsProps) {
	const { t } = useLingui()

	return (
		<div class="flex flex-col">
			<div class="border-b border-slate-200 pb-4">
				<CommentComposer
					onSubmit={(content) => props.controller.createComment(content, null)}
					currentUser={props.controller.currentUser()}
					signedOutFallback={
						<div class="rounded bg-slate-50 p-4 text-center text-sm text-tertiary">
							<Link
								to="/auth"
								search={{ type: "sign_in" }}
							>
								{t`Sign in`}
							</Link>{" "}
							{t`to comment`}
						</div>
					}
				/>
			</div>

			<CommentThreadList
				comments={props.controller.comments()}
				hasMore={props.controller.hasMore()}
				isInitialLoading={props.controller.isInitialLoading()}
				isLoadingMore={props.controller.isLoadingMore()}
				errorMessage={props.controller.errorMessage()}
				currentUser={props.controller.currentUser()}
				canManage={props.controller.canManage()}
				emptyText={t`No comments yet`}
				listClass="divide-y divide-slate-100"
				statusClass="py-6 text-center text-sm text-tertiary"
				loadMoreClass="mt-4 flex justify-center py-4"
				onLoadMore={() => {
					void props.controller.loadMore()
				}}
				onCreateComment={props.controller.createComment}
				onDeleteComment={props.controller.deleteComment}
			/>
		</div>
	)
}
