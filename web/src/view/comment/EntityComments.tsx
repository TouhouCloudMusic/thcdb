import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { createContext, useContext } from "solid-js"
import type { Accessor, ParentProps } from "solid-js"

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
import type {
	CommentComposerActions,
	CommentThreadModel,
} from "./CommentThread"

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

type ModelContextValue = { model: CommentThreadModel }

const ModelContext = createContext<ModelContextValue>()

function useModelContext() {
	const context = useContext(ModelContext)
	if (!context) throw new Error("EntityComments requires EntityComments.Root")
	return context
}

function Root(props: ParentProps<ModelContextValue>) {
	return (
		<ModelContext.Provider value={props}>
			<div {...stylex.attrs(styles.root)}>{props.children}</div>
		</ModelContext.Provider>
	)
}

function Form(props: { disabled?: boolean; actions?: CommentComposerActions }) {
	const { t } = useLingui()
	const userCtx = useCurrentUser()
	const context = useModelContext()

	return (
		<div {...stylex.attrs(styles.composer)}>
			<CommentComposer
				onSubmit={(content) => context.model.createComment(content, null)}
				currentUser={userCtx.profile}
				signedOutFallback={
					<div {...stylex.attrs(styles.signedOut)}>
						<Link
							class={stylex.attrs(link.base, link.withUnderline).class}
							to="/auth/sign-in"
						>{t`Sign in`}</Link>{" "}
						{t`to comment`}
					</div>
				}
				disabled={props.disabled}
				actions={props.actions}
			/>
		</div>
	)
}

function List() {
	const { t } = useLingui()
	const userCtx = useCurrentUser()
	const context = useModelContext()

	return (
		<CommentThreadList
			model={context.model}
			currentUser={userCtx.profile}
			emptyText={t`No comments yet`}
			itemStyles={styles.commentItem}
			statusStyles={styles.status}
			loadMoreStyles={styles.loadMore}
		/>
	)
}

export const EntityComments = { Root, Form, List }
