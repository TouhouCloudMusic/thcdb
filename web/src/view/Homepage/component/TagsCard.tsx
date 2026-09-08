import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import type { TagListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { surfaceStyles } from "~/style/primitives"
import { radius, colors, fontSizes, px } from "~/style/tokens.stylex"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { TAGS_LIMIT } from "~/view/Homepage/constants"

import { animationNames } from "../../../style/animations.stylex"

const styles = stylex.create({
	skeleton: {
		paddingTop: { default: px[12], ":first-child": 0 },
		paddingBottom: { default: px[12], ":last-child": 0 },
		borderTopWidth: { default: null, ":not(:last-child)": 0 },
		borderBottomWidth: { default: null, ":not(:last-child)": 1 },
		borderBlockStyle: "solid",
		borderColor: palette.slate[300],
		animationName: {
			default: animationNames.pulse,
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		animationDuration: "2s",
		animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
		animationIterationCount: "infinite",
	},
	row: {
		paddingTop: { default: px[12], ":first-child": 0 },
		paddingBottom: { default: px[12], ":last-child": 0 },
		borderTopWidth: { default: null, ":not(:last-child)": 0 },
		borderBottomWidth: { default: null, ":not(:last-child)": 1 },
		borderBlockStyle: "solid",
		borderColor: palette.slate[300],
	},
	nameSkeleton: {
		height: px[16],
		width: "calc(1/3 * 100%)",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	descriptionSkeleton: {
		marginTop: px[6],
		height: px[14],
		width: "80%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	empty: { height: px[96] },
	name: {
		display: "block",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		fontWeight: 300,
		letterSpacing: 0,
		color: colors.textPrimary,
	},
	description: {
		marginTop: px[4],
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 2,
		fontSize: fontSizes.sm,
		lineHeight: 1.375,
		fontWeight: 300,
		color: colors.textTertiary,
	},
	root: { padding: 0, boxShadow: "none" },
})

function TagRowSkeleton() {
	return (
		<li {...stylex.attrs(styles.skeleton)}>
			<div {...stylex.attrs(styles.nameSkeleton)}></div>
			<div {...stylex.attrs(styles.descriptionSkeleton)}></div>
		</li>
	)
}

function TagsListSkeleton() {
	return (
		<ul>
			<For each={Array.from({ length: TAGS_LIMIT })}>
				{() => <TagRowSkeleton />}
			</For>
		</ul>
	)
}

function TagsList(props: { tags: TagListItem[] }) {
	return (
		<Show
			when={props.tags.length > 0}
			fallback={<HomeEmptySlot styles={styles.empty} />}
		>
			<ul>
				<For each={props.tags}>
					{(tag) => (
						<li {...stylex.attrs(styles.row)}>
							<Link
								to="/tag/$id"
								params={{ id: tag.id.toString() }}
								class={stylex.attrs(link.base, link.text, styles.name).class}
							>
								{tag.name}
							</Link>
							<div {...stylex.attrs(styles.description)}>
								{tag.short_description}
							</div>
						</li>
					)}
				</For>
			</ul>
		</Show>
	)
}

export function TagsCardSkeleton() {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(surfaceStyles.card, styles.root)}>
			<ExploreSection
				title={t`Trending Tags`}
				to="/tag/explore"
			>
				<TagsListSkeleton />
			</ExploreSection>
		</div>
	)
}

export function TagsCard(props: { tags: TagListItem[] }) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(surfaceStyles.card, styles.root)}>
			<ExploreSection
				title={t`Trending Tags`}
				to="/tag/explore"
			>
				<TagsList tags={props.tags} />
			</ExploreSection>
		</div>
	)
}
