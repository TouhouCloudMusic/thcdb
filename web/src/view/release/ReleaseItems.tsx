import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import { DateWithPrecision } from "~/domain/shared"
import type { ReleaseListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

const styles = stylex.create({
	thumbnailImage: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
	metadataSpacing: {
		marginBlockStart: 0,
		marginBlockEnd: { default: null, ":not(:last-child)": px[4] },
	},
	artists: {
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	artistLink: { color: colors.textSecondary, textDecorationLine: "none" },
	metadata: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "baseline",
		columnGap: px[12],
		rowGap: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	coverLink: {
		display: "block",
		aspectRatio: "1 / 1",
		overflow: "hidden",
		borderRadius: radius.sm,
		backgroundColor: colors.backgroundSecondary,
		textDecorationLine: "none",
		boxShadow: {
			default: null,
			":focus-visible": `0 0 0 2px ${palette.slate[200]}`,
		},
	},
	coverImage: { width: "100%", height: "100%", objectFit: "cover" },
	gridDetails: { marginTop: px[8] },
	gridTitle: {
		display: "block",
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		textDecorationLine: "none",
	},
	listItem: {
		display: "grid",
		gridTemplateColumns: "3lh minmax(0,1fr)",
		alignItems: "flex-start",
		gap: px[12],
		lineHeight: "1.5rem",
	},
	thumbnail: {
		position: "relative",
		aspectRatio: "1 / 1",
		overflow: "hidden",
		borderRadius: radius.sm,
		textDecorationLine: "none",
		boxShadow: { default: null, ":focus-visible": "0 0 0 2px currentColor" },
	},
	listDetails: {
		display: "flex",
		flexDirection: "column",
		gap: px[4],
	},
	listTitle: {
		overflowWrap: "break-word",
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		textDecorationLine: "none",
	},
})

function ReleaseArtists(props: {
	release: ReleaseListItem
	styles?: StyleXStyles
}) {
	return (
		<Show when={props.release.artists.length > 0}>
			<div {...stylex.attrs(styles.artists, props.styles)}>
				<For each={props.release.artists}>
					{(artist, index) => (
						<>
							<Link
								to="/artist/$id"
								params={{ id: artist.id.toString() }}
								class={
									stylex.attrs(link.base, link.text, styles.artistLink).class
								}
							>
								{artist.name}
							</Link>
							<Show when={index() < props.release.artists.length - 1}>
								{", "}
							</Show>
						</>
					)}
				</For>
			</div>
		</Show>
	)
}

function ReleaseMeta(props: {
	release: ReleaseListItem
	styles?: StyleXStyles
}) {
	const releaseDate = () =>
		DateWithPrecision.display(props.release.release_date)

	return (
		<div {...stylex.attrs(styles.metadata, props.styles)}>
			<span>{props.release.release_type}</span>
			<Show when={releaseDate()}>{(date) => <span>{date()}</span>}</Show>
			<Show when={props.release.catalog_numbers.length > 0}>
				<span>#{props.release.catalog_numbers.join(" / #")}</span>
			</Show>
		</div>
	)
}

export function ReleaseGridItem(props: { release: ReleaseListItem }) {
	const coverUrl = () => imgUrl(props.release.cover_art_url)

	return (
		<div>
			<Link
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				{...stylex.attrs(styles.coverLink)}
				aria-label={props.release.title}
			>
				<Show when={coverUrl()}>
					{(src) => (
						<img
							src={src()}
							alt=""
							{...stylex.attrs(styles.coverImage)}
							loading="lazy"
						/>
					)}
				</Show>
			</Link>

			<div {...stylex.attrs(styles.gridDetails)}>
				<Link
					to="/release/$id"
					params={{ id: props.release.id.toString() }}
					class={
						stylex.attrs(
							link.base,
							link.text,
							styles.metadataSpacing,
							styles.gridTitle,
						).class
					}
				>
					{props.release.title}
				</Link>
				<ReleaseArtists
					styles={styles.metadataSpacing}
					release={props.release}
				/>
				<ReleaseMeta
					styles={styles.metadataSpacing}
					release={props.release}
				/>
			</div>
		</div>
	)
}

export function ReleaseItem(props: { release: ReleaseListItem }) {
	return (
		<div {...stylex.attrs(styles.listItem)}>
			<Thumbnail
				src={imgUrl(props.release.cover_art_url)}
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				aria-label={props.release.title}
				styles={styles.thumbnail}
				imageStyles={styles.thumbnailImage}
			/>

			<div {...stylex.attrs(styles.listDetails)}>
				<Link
					to="/release/$id"
					params={{ id: props.release.id.toString() }}
					class={stylex.attrs(link.base, link.text, styles.listTitle).class}
				>
					{props.release.title}
				</Link>
				<ReleaseArtists release={props.release} />
				<ReleaseMeta release={props.release} />
			</div>
		</div>
	)
}
