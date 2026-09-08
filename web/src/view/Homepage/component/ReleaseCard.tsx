import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import type { ReleaseListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { surfaceStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"
import { displayReleaseDate } from "~/view/Homepage/utils"

import { animationNames } from "../../../style/animations.stylex"
import { releaseCard as cardMarker } from "./cardMarkers.stylex"

const styles = stylex.create({
	root: {
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
		borderRadius: 0,
		padding: 0,
		boxShadow: "none",
		aspectRatio: { default: null, "@media (min-width: 40rem)": "1/1.309" },
	},
	skeleton: {
		animationName: {
			default: animationNames.pulse,
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		animationDuration: "2s",
		animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
		animationIterationCount: "infinite",
	},
	release: { position: "relative" },
	skeletonCover: {
		aspectRatio: "1",
		width: "100%",
		flexShrink: 0,
		backgroundColor: palette.slate[100],
	},
	content: {
		display: "grid",
		minHeight: 0,
		flex: "1",
		gridTemplateRows: "repeat(2,minmax(0,1fr))",
		padding: px[4],
	},
	skeletonHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[8],
	},
	skeletonTitle: {
		height: px[20],
		width: "75%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonDate: {
		height: px[12],
		width: px[40],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	skeletonDetails: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
		alignSelf: "end",
	},
	skeletonArtist: {
		height: px[12],
		width: "50%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	skeletonType: {
		height: px[12],
		width: px[48],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	coverLink: { flexShrink: 0 },
	placeholder: { aspectRatio: "1", backgroundColor: palette.slate[100] },
	alternatePlaceholder: { backgroundColor: palette.slate[200] },
	cover: {
		aspectRatio: "1",
		width: "100%",
		backgroundColor: palette.slate[100],
		objectFit: "cover",
	},
	header: {
		display: "flex",
		minWidth: 0,
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: px[8],
	},
	title: {
		minWidth: 0,
		flex: "1",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		fontWeight: 300,
		letterSpacing: 0,
		color: colors.textPrimary,
	},
	date: {
		flexShrink: 0,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 300,
		color: colors.textTertiary,
	},
	details: {
		display: "flex",
		minWidth: 0,
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: px[12],
		alignSelf: "end",
	},
	artists: {
		minWidth: 0,
		flex: "1",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 300,
		letterSpacing: 0,
		color: palette.reimu[600],
	},
	artistLink: { color: palette.reimu[600] },
	type: {
		flexShrink: 0,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 300,
		letterSpacing: 0,
		color: colors.textSecondary,
	},
	overlay: {
		pointerEvents: "none",
		position: "absolute",
		inset: 0,
		backgroundColor: `color-mix(in oklab, ${palette.slate[700]} 5%, transparent)`,
		opacity: {
			default: 0,
			"@media (hover: hover)": {
				[stylex.when.ancestor(":hover", cardMarker)]: 1,
			},
			[stylex.when.ancestor(":focus-within", cardMarker)]: 1,
		},
		transitionProperty: {
			default: "opacity",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
})
export function ReleaseCardSkeleton() {
	return (
		<div {...stylex.attrs(surfaceStyles.card, styles.root, styles.skeleton)}>
			<div {...stylex.attrs(styles.skeletonCover)}></div>
			<div {...stylex.attrs(styles.content)}>
				<div {...stylex.attrs(styles.skeletonHeader)}>
					<div {...stylex.attrs(styles.skeletonTitle)}></div>
					<div {...stylex.attrs(styles.skeletonDate)}></div>
				</div>

				<div {...stylex.attrs(styles.skeletonDetails)}>
					<div {...stylex.attrs(styles.skeletonArtist)}></div>
					<div {...stylex.attrs(styles.skeletonType)}></div>
				</div>
			</div>
		</div>
	)
}

type ReleaseCardProps = {
	release: ReleaseListItem
}

export function ReleaseCard(props: ReleaseCardProps) {
	const { t } = useLingui()
	const artists = () => props.release.artists.slice(0, 3)
	const releaseDate = () => displayReleaseDate(props.release.release_date)
	const coverUrl = () => imgUrl(props.release.cover_art_url)

	return (
		<div
			{...stylex.attrs(
				cardMarker,
				surfaceStyles.card,
				styles.root,
				styles.release,
			)}
		>
			<Link
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				aria-label={props.release.title}
				class={stylex.attrs(link.base, styles.coverLink).class}
			>
				<Show
					when={coverUrl()}
					fallback={
						<div
							aria-hidden="true"
							{...stylex.attrs(
								styles.placeholder,
								props.release.id % 2 === 0 && styles.alternatePlaceholder,
							)}
						></div>
					}
				>
					{(src) => (
						<img
							src={src()}
							alt=""
							loading="lazy"
							{...stylex.attrs(styles.cover)}
						/>
					)}
				</Show>
			</Link>

			<div {...stylex.attrs(styles.content)}>
				<div {...stylex.attrs(styles.header)}>
					<Link
						to="/release/$id"
						params={{ id: props.release.id.toString() }}
						class={stylex.attrs(link.base, link.text, styles.title).class}
					>
						{props.release.title}
					</Link>
					<Show when={releaseDate()}>
						{(date) => <span {...stylex.attrs(styles.date)}>{date()}</span>}
					</Show>
				</div>

				<div {...stylex.attrs(styles.details)}>
					<div {...stylex.attrs(styles.artists)}>
						<Show
							when={artists().length > 0}
							fallback={t`Unknown artist`}
						>
							<For each={artists()}>
								{(artist, index) => (
									<>
										<Show when={index() > 0}> · </Show>
										<Link
											to="/artist/$id"
											params={{ id: artist.id.toString() }}
											title={artist.name}
											class={
												stylex.attrs(link.base, link.text, styles.artistLink)
													.class
											}
										>
											{artist.name}
										</Link>
									</>
								)}
							</For>
						</Show>
					</div>
					<span {...stylex.attrs(styles.type)}>
						{props.release.release_type}
					</span>
				</div>
			</div>

			<div
				aria-hidden="true"
				{...stylex.attrs(styles.overlay)}
			></div>
		</div>
	)
}
