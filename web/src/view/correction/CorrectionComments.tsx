import { useLingui } from "@lingui/solid/macro"
import { Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { useCurrentUser } from "~/state/user"
import {
	CommentComposer,
	CommentThreadList,
} from "~/view/comment/CommentThread"
import type { CommentThreadModel } from "~/view/comment/CommentThread"

type CorrectionCommentsProps = {
	model: CommentThreadModel
}

export function CorrectionComments(props: CorrectionCommentsProps) {
	const { t } = useLingui()
	const userCtx = useCurrentUser()

	return (
		<Card class="overflow-hidden border border-slate-300 p-0 shadow-xs">
			<div class="flex items-center justify-between border-b border-slate-300 bg-slate-50 px-4 py-3">
				<span class="text-xs font-medium tracking-wider text-slate-600 uppercase">
					{t`Comments`}
				</span>
				<span class="font-mono text-xs text-slate-400">
					<Suspense>{props.model.comments().length}</Suspense>
				</span>
			</div>

			<CommentThreadList
				model={props.model}
				currentUser={userCtx.profile}
				emptyText={t`No comments yet.`}
				listClass="divide-y divide-slate-200 px-4"
				statusClass="px-4 py-6 text-sm text-tertiary"
				loadMoreClass="flex justify-center border-t border-slate-200 px-4 py-3"
			/>

			<div class="border-t border-slate-300 p-4">
				<CommentComposer
					onSubmit={(content) => props.model.createComment(content, null)}
					currentUser={userCtx.profile}
					signedOutFallback={
						<p class="text-sm text-tertiary">
							<Link to="/auth/sign-in">{t`Sign in`}</Link> {t`to comment`}
						</p>
					}
				/>
			</div>
		</Card>
	)
}
