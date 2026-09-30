import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import type { SongListing } from "~/hey-api"
import { textStyles } from "~/style"
import { link } from "~/style/link"
import { listItemStyles } from "~/style/primitives"
import { radius, fontSizes, lineHeights } from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

const songItemStyles = stylex.create({
	thumbnail: { borderRadius: radius.sm },
	title: { fontSize: fontSizes.base, lineHeight: lineHeights.base },
})

export function SongItem(props: { song: SongListing }) {
	return (
		<div {...stylex.attrs(listItemStyles.row)}>
			<Thumbnail
				src={imgUrl(props.song.cover_art_url, 8)}
				to="/song/$id"
				params={{ id: props.song.id.toString() }}
				aria-label={props.song.title}
				styles={songItemStyles.thumbnail}
			/>

			<div {...stylex.attrs(listItemStyles.content)}>
				<Link
					to="/song/$id"
					params={{ id: props.song.id.toString() }}
					class={
						stylex.attrs(
							link.base,
							link.withUnderline,
							songItemStyles.title,
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
												link.secondary,
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
												link.secondary,
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
