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
import { listItemStyles } from "~/style/primitives"
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

const artistsStyles = stylex.create({
	root: {
		fontSize: fontSizes.sm,
		color: colors.textTertiary,
	},
	link: { textDecorationLine: "none" },
})

function ReleaseArtists(props: {
	release: ReleaseItemData
	styles?: StyleXStyles
}) {
	return (
		<Show when={props.release.artists.length > 0}>
			<div
				{...stylex.attrs(artistsStyles.root, textStyles.ellipsis, props.styles)}
			>
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
						class={
							stylex.attrs(link.base, link.secondary, artistsStyles.link).class
						}
					>
						{artist.name}
					</Link>
					<Show when={index() < props.release.artists.length - 1}>{", "}</Show>
				</>
			)}
		</For>
	)
}

function ReleaseMeta(props: {
	release: ReleaseItemData
	styles?: StyleXStyles
}) {
	const releaseDate = () =>
		DateWithPrecision.display(props.release.release_date)

	return (
		<div {...stylex.attrs(listItemStyles.metadata, props.styles)}>
			<span>{props.release.release_type}</span>
			<Show when={releaseDate()}>{(date) => <span>{date()}</span>}</Show>
			<Show when={props.release.catalog_numbers?.length}>
				<span>#{props.release.catalog_numbers?.join(" / #")}</span>
			</Show>
		</div>
	)
}

const releaseGridStyles = stylex.create({
	meta: {
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
	const coverUrl = () => imgUrl(props.release.cover_art_url, 9)

	return (
		<div>
			<Link
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				{...stylex.attrs(releaseGridStyles.coverLink)}
				aria-label={props.release.title}
			>
				<Show when={coverUrl()}>
					{(src) => (
						<img
							src={src()}
							alt=""
							{...stylex.attrs(releaseGridStyles.coverImage)}
							loading="lazy"
						/>
					)}
				</Show>
			</Link>

			<div {...stylex.attrs(releaseGridStyles.details)}>
				<Link
					to="/release/$id"
					params={{ id: props.release.id.toString() }}
					class={
						stylex.attrs(link.base, link.withUnderline, releaseGridStyles.title)
							.class
					}
				>
					{props.release.title}
				</Link>
				<ReleaseArtists release={props.release} />
				<ReleaseMeta
					release={props.release}
					styles={releaseGridStyles.meta}
				/>
			</div>
		</div>
	)
}

const releaseItemStyles = stylex.create({
	thumbnail: { borderRadius: radius.sm },
	title: {
		display: "block",
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
	},
	artists: {
		lineHeight: lineHeights.sm,
	},
	meta: {
		gridRow: "3",
		columnGap: px[6],
	},
})

export function ReleaseItem(props: {
	release: ReleaseItemData
	styles?: StyleXStyles
}) {
	return (
		<div {...stylex.attrs(listItemStyles.row, props.styles)}>
			<Thumbnail
				src={imgUrl(props.release.cover_art_url, 7)}
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				aria-label={props.release.title}
				styles={releaseItemStyles.thumbnail}
			/>

			<div {...stylex.attrs(listItemStyles.content)}>
				<Link
					to="/release/$id"
					params={{ id: props.release.id.toString() }}
					{...stylex.attrs(
						link.base,
						releaseItemStyles.title,
						textStyles.ellipsis,
					)}
				>
					{props.release.title}
				</Link>
				<ReleaseArtists
					release={props.release}
					styles={releaseItemStyles.artists}
				/>
				<ReleaseMeta
					release={props.release}
					styles={releaseItemStyles.meta}
				/>
			</div>
		</div>
	)
}
