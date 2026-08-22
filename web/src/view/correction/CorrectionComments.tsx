import { useLingui } from "@lingui/solid/macro"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import {
	CommentComposer,
	CommentThreadList,
} from "~/view/comment/CommentThread"
import type { EntityCommentsController } from "~/view/comment/EntityCommentsController"

export function CorrectionComments(props: {
	controller: EntityCommentsController
}) {
	const { t } = useLingui()

	return (
		<Card class="overflow-hidden border border-slate-300 p-0 shadow-xs">
			<div class="flex items-center justify-between border-b border-slate-300 bg-slate-50 px-4 py-3">
				<span class="text-xs font-medium tracking-wider text-slate-600 uppercase">
					{t`Comments`}
				</span>
				<span class="font-mono text-xs text-slate-400">
					{props.controller.comments().length}
				</span>
			</div>

			<CommentThreadList
				controller={props.controller}
				emptyText={t`No comments yet.`}
				listClass="divide-y divide-slate-200 px-4"
				statusClass="px-4 py-6 text-sm text-tertiary"
				loadMoreClass="flex justify-center border-t border-slate-200 px-4 py-3"
			/>

			<div class="border-t border-slate-300 p-4">
				<CommentComposer
					onSubmit={(content) => props.controller.createComment(content, null)}
					currentUser={props.controller.currentUser()}
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
