import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import type { SongListItem } from "~/hey-api"
import { textStyles } from "~/style"
import { link } from "~/style/link"
import { listItemStyles } from "~/style/primitives"
import { radius, colors, fontSizes, px } from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

const styles = stylex.create({
	resultRow: {
		display: "grid",
		gridTemplateColumns: `${px[64]} minmax(0,1fr)`,
		alignItems: "flex-start",
		columnGap: px[16],
	},
	thumbnail: {
		borderRadius: radius.sm,
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
				src={imgUrl(props.song.cover_art_url, 8)}
				to="/song/$id"
				params={{ id: props.song.id.toString() }}
				aria-label={props.song.title}
				styles={[styles.thumbnail]}
			/>

			<div {...stylex.attrs(listItemStyles.content)}>
				<Link
					to="/song/$id"
					params={{ id: props.song.id.toString() }}
					class={
						stylex.attrs(
							link.base,
							link.withUnderline,
							styles.title,
							textStyles.ellipsis,
						).class
					}
				>
					{props.song.title}
				</Link>

				<Show when={props.song.artists.length > 0}>
					<div {...stylex.attrs(listItemStyles.metadata)}>
						<For each={props.song.artists}>
							{(artist, index) => (
								<>
									<Link
										to="/artist/$id"
										params={{ id: artist.id.toString() }}
										class={
											stylex.attrs(
												link.base,
												link.withUnderline,
												styles.metadataLink,
											).class
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

				<Show when={props.song.releases.length > 0}>
					<div {...stylex.attrs(listItemStyles.metadata)}>
						<For each={props.song.releases}>
							{(release, index) => (
								<>
									<Link
										to="/release/$id"
										params={{ id: release.id.toString() }}
										class={
											stylex.attrs(
												link.base,
												link.withUnderline,
												styles.metadataLink,
											).class
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
			</div>
		</div>
	)
}
