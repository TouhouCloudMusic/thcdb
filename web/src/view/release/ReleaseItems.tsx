import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import { DateWithPrecision } from "~/domain/shared"
import type { ReleaseListItem } from "~/hey-api"
import { textStyles } from "~/style"
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

type ReleaseItemData = Omit<ReleaseListItem, "catalog_numbers"> & {
	catalog_numbers?: ReleaseListItem["catalog_numbers"]
}

const styles = stylex.create({
	artists: {
		fontSize: fontSizes.sm,
		color: colors.textTertiary,
	},
	artistLink: { color: colors.textSecondary, textDecorationLine: "none" },
})

function ReleaseArtists(props: {
	release: ReleaseItemData
	styles?: StyleXStyles
}) {
	return (
		<Show when={props.release.artists.length > 0}>
			<div {...stylex.attrs(styles.artists, textStyles.ellipsis, props.styles)}>
				<ReleaseArtistLinks release={props.release} />
			</div>
		</Show>
	)
}

function ReleaseArtistLinks(props: { release: ReleaseItemData }) {
	return (
		<For each={props.release.artists}>
			{(artist, index) => (
				<>
					<Link
						to="/artist/$id"
						params={{ id: artist.id.toString() }}
						class={stylex.attrs(link.base, styles.artistLink).class}
					>
						{artist.name}
					</Link>
					<Show when={index() < props.release.artists.length - 1}>{", "}</Show>
				</>
			)}
		</For>
	)
}

const metaStyles = stylex.create({
	root: {
		display: "flex",
		fontSize: fontSizes.sm,
		color: colors.textTertiary,
	},
})

function ReleaseMeta(props: {
	release: ReleaseItemData
	styles?: StyleXStyles
}) {
	const releaseDate = () =>
		DateWithPrecision.display(props.release.release_date)

	return (
		<div {...stylex.attrs(metaStyles.root, props.styles)}>
			<span>{props.release.release_type}</span>
			<Show when={releaseDate()}>{(date) => <span>{date()}</span>}</Show>
			<Show when={props.release.catalog_numbers?.length}>
				<span>#{props.release.catalog_numbers?.join(" / #")}</span>
			</Show>
		</div>
	)
}

const gridStyles = stylex.create({
	meta: {
		flexWrap: "nowrap",
		alignItems: "baseline",
		columnGap: px[12],
		rowGap: px[4],
		lineHeight: lineHeights.sm,
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
	details: {
		display: "grid",
		alignContent: "start",
		rowGap: px[4],
		marginBlockStart: px[8],
		minWidth: 0,
	},
	title: {
		display: "block",
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		textDecorationLine: "none",
	},
})

export function ReleaseGridItem(props: { release: ReleaseListItem }) {
	const coverUrl = () => imgUrl(props.release.cover_art_url)

	return (
		<div>
			<Link
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				{...stylex.attrs(gridStyles.coverLink)}
				aria-label={props.release.title}
			>
				<Show when={coverUrl()}>
					{(src) => (
						<img
							src={src()}
							alt=""
							{...stylex.attrs(gridStyles.coverImage)}
							loading="lazy"
						/>
					)}
				</Show>
			</Link>

			<div {...stylex.attrs(gridStyles.details)}>
				<Link
					to="/release/$id"
					params={{ id: props.release.id.toString() }}
					class={
						stylex.attrs(link.base, link.withUnderline, gridStyles.title).class
					}
				>
					{props.release.title}
				</Link>
				<ReleaseArtists release={props.release} />
				<ReleaseMeta
					release={props.release}
					styles={gridStyles.meta}
				/>
			</div>
		</div>
	)
}

const listStyles = stylex.create({
	thumbnail: {
		borderRadius: radius.sm,
	},
	item: {
		display: "grid",
		gridTemplateColumns: `${px[64]} minmax(0,1fr)`,
		alignItems: "flex-start",
		columnGap: px[16],
	},
	details: {
		display: "grid",
		gridTemplateRows: `repeat(3, ${px[14]})`,
		alignContent: "space-between",
		height: "100%",
	},
	titleContainer: {
		display: "flex",
		alignItems: "center",
		lineHeight: 1,
	},
	artists: {
		lineHeight: 1,
	},
	meta: {
		columnGap: px[4],
		lineHeight: 1,
	},
})

export function ReleaseItem(props: {
	release: ReleaseItemData
	styles?: StyleXStyles
}) {
	return (
		<div {...stylex.attrs(listStyles.item, props.styles)}>
			<Thumbnail
				src={imgUrl(props.release.cover_art_url)}
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				aria-label={props.release.title}
				styles={listStyles.thumbnail}
			/>

			<div {...stylex.attrs(listStyles.details)}>
				{/* the extra container prevents the text from being clipped vertically */}
				<div {...stylex.attrs(listStyles.titleContainer)}>
					<Link
						to="/release/$id"
						params={{ id: props.release.id.toString() }}
						{...stylex.attrs(link.base, textStyles.ellipsis)}
					>
						{props.release.title}
					</Link>
				</div>
				<ReleaseArtists
					release={props.release}
					styles={listStyles.artists}
				/>
				<ReleaseMeta
					release={props.release}
					styles={listStyles.meta}
				/>
			</div>
		</div>
	)
}
