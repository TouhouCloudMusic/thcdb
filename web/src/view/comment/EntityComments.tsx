import { useLingui } from "@lingui/solid/macro"
import type { Accessor } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { useCurrentUser } from "~/state/user"

import { CommentComposer, CommentThreadList } from "./CommentThread"
import type { CommentThreadModel } from "./CommentThread"

export type EntityCommentsModel = CommentThreadModel & {
	activeCommentCount: Accessor<number | undefined>
}

export type EntityCommentsProps = {
	model: CommentThreadModel
}

export function EntityComments(props: EntityCommentsProps) {
	const { t } = useLingui()
	const userCtx = useCurrentUser()

	return (
		<div class="flex flex-col">
			<div class="border-b border-slate-200 pb-4">
				<CommentComposer
					onSubmit={(content) => props.model.createComment(content, null)}
					currentUser={userCtx.profile}
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
				model={props.model}
				currentUser={userCtx.profile}
				emptyText={t`No comments yet`}
				listClass="divide-y divide-slate-100"
				statusClass="py-6 text-center text-sm text-tertiary"
				loadMoreClass="mt-4 flex justify-center py-4"
			/>
		</div>
	)
}
