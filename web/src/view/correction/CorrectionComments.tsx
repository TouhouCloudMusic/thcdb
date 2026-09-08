import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { Suspense } from "solid-js"

import { useCurrentUser } from "~/state/user"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { surfaceStyles } from "~/style/primitives"
import {
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import {
	CommentComposer,
	CommentThreadList,
} from "~/view/comment/CommentThread"
import type { CommentThreadModel } from "~/view/comment/CommentThread"

const styles = stylex.create({
	commentItem: {
		borderBottomWidth: { default: null, ":not(:last-child)": "1px" },
		borderBottomStyle: { default: null, ":not(:last-child)": "solid" },
		borderColor: palette.slate[200],
	},
	card: {
		overflow: "hidden",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[300],
		paddingTop: 0,
		paddingRight: 0,
		paddingBottom: 0,
		paddingLeft: 0,
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
	header: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		borderColor: palette.slate[300],
		paddingLeft: px[16],
		paddingRight: px[16],
		paddingTop: px[12],
		paddingBottom: px[12],
	},
	title: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: ".05em",
		color: palette.slate[600],
		textTransform: "uppercase",
	},
	count: {
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[400],
	},
	list: { paddingLeft: px[16], paddingRight: px[16] },
	status: {
		paddingLeft: px[16],
		paddingRight: px[16],
		paddingTop: px[24],
		paddingBottom: px[24],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	loadMore: {
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		display: "flex",
		justifyContent: "center",
		borderColor: palette.slate[200],
		paddingLeft: px[16],
		paddingRight: px[16],
		paddingTop: px[12],
		paddingBottom: px[12],
	},
	composer: {
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderColor: palette.slate[300],
		paddingTop: px[16],
		paddingRight: px[16],
		paddingBottom: px[16],
		paddingLeft: px[16],
	},
	signedOut: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

type CorrectionCommentsProps = {
	model: CommentThreadModel
}

export function CorrectionComments(props: CorrectionCommentsProps) {
	const { t } = useLingui()
	const userCtx = useCurrentUser()

	return (
		<div {...stylex.attrs(surfaceStyles.card, styles.card)}>
			<div {...stylex.attrs(styles.header)}>
				<span {...stylex.attrs(styles.title)}>{t`Comments`}</span>
				<span {...stylex.attrs(styles.count)}>
					<Suspense>{props.model.comments().length}</Suspense>
				</span>
			</div>

			<CommentThreadList
				model={props.model}
				currentUser={userCtx.profile}
				emptyText={t`No comments yet.`}
				listStyles={styles.list}
				itemStyles={styles.commentItem}
				statusStyles={styles.status}
				loadMoreStyles={styles.loadMore}
			/>

			<div {...stylex.attrs(styles.composer)}>
				<CommentComposer
					onSubmit={(content) => props.model.createComment(content, null)}
					currentUser={userCtx.profile}
					signedOutFallback={
						<p {...stylex.attrs(styles.signedOut)}>
							<Link
								class={stylex.attrs(link.base, link.text).class}
								to="/auth/sign-in"
							>{t`Sign in`}</Link>{" "}
							{t`to comment`}
						</p>
					}
				/>
			</div>
		</div>
	)
}
