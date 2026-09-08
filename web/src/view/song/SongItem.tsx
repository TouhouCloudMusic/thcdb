import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import type { SongListItem } from "~/hey-api"
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
	resultRow: {
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
		borderRadius: radius.xs,
		textDecorationLine: "none",
		boxShadow: {
			default: null,
			":focus-visible": "0 0 0 2px currentcolor",
		},
	},
	image: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
	title: {
		overflowWrap: "break-word",
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	metadata: {
		marginTop: px[4],
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	metadataLink: {
		color: colors.textSecondary,
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
})

export function SongItem(props: { song: SongListItem }) {
	return (
		<div {...stylex.attrs(styles.resultRow)}>
			<Thumbnail
				src={imgUrl(props.song.cover_art_url)}
				to="/song/$id"
				params={{ id: props.song.id.toString() }}
				aria-label={props.song.title}
				styles={[styles.thumbnail]}
				imageStyles={[styles.image]}
			/>

			<div>
				<Link
					to="/song/$id"
					params={{ id: props.song.id.toString() }}
					class={stylex.attrs(link.base, link.text, styles.title).class}
				>
					{props.song.title}
				</Link>

				<Show when={props.song.releases.length > 0}>
					<div {...stylex.attrs(styles.metadata)}>
						<For each={props.song.releases}>
							{(release, index) => (
								<>
									<Link
										to="/release/$id"
										params={{ id: release.id.toString() }}
										class={
											stylex.attrs(link.base, link.text, styles.metadataLink)
												.class
										}
									>
										{release.title}
									</Link>
									<Show when={index() < props.song.releases.length - 1}>
										{", "}
									</Show>
								</>
							)}
						</For>
					</div>
				</Show>

				<Show when={props.song.artists.length > 0}>
					<div {...stylex.attrs(styles.metadata)}>
						<For each={props.song.artists}>
							{(artist, index) => (
								<>
									<Link
										to="/artist/$id"
										params={{ id: artist.id.toString() }}
										class={
											stylex.attrs(link.base, link.text, styles.metadataLink)
												.class
										}
									>
										{artist.name}
									</Link>
									<Show when={index() < props.song.artists.length - 1}>
										{", "}
									</Show>
								</>
							)}
						</For>
					</div>
				</Show>
			</div>
		</div>
	)
}
