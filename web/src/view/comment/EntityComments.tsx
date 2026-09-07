import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { Accessor } from "solid-js"

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

import { CommentComposer, CommentThreadList } from "./CommentThread"
import type { CommentThreadModel } from "./CommentThread"

const styles = stylex.create({
	commentItem: {
		borderBottomWidth: { default: null, ":not(:last-child)": "1px" },
		borderBottomStyle: { default: null, ":not(:last-child)": "solid" },
		borderColor: palette.slate[100],
	},
	root: { display: "flex", flexDirection: "column" },
	composer: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[200],
		paddingBottom: px[16],
	},
	signedOut: {
		borderRadius: radius.sm,
		paddingTop: px[16],
		paddingRight: px[16],
		paddingBottom: px[16],
		paddingLeft: px[16],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	status: {
		paddingTop: px[24],
		paddingBottom: px[24],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	loadMore: {
		marginTop: px[16],
		display: "flex",
		justifyContent: "center",
		paddingTop: px[16],
		paddingBottom: px[16],
	},
})

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
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.composer)}>
				<CommentComposer
					onSubmit={(content) => props.model.createComment(content, null)}
					currentUser={userCtx.profile}
					signedOutFallback={
						<div {...stylex.attrs(styles.signedOut)}>
							<Link
								class={stylex.attrs(link.base, link.text).class}
								to="/auth/sign-in"
							>{t`Sign in`}</Link>{" "}
							{t`to comment`}
						</div>
					}
				/>
			</div>

			<CommentThreadList
				model={props.model}
				currentUser={userCtx.profile}
				emptyText={t`No comments yet`}
				itemStyles={styles.commentItem}
				statusStyles={styles.status}
				loadMoreStyles={styles.loadMore}
			/>
		</div>
	)
}
