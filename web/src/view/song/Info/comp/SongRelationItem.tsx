import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import { Badge } from "~/component/atomic/Badge"
import { Intersperse } from "~/component/data/Intersperse"
import { formatTrackPosition } from "~/domain/release/formatTrackPosition"
import { DateWithPrecision } from "~/domain/shared"
import type { ReleaseTrackPosition, SongRelation } from "~/hey-api"
import { copyStyles, textStyles } from "~/style"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	fontSizes,
	lineHeights,
	px,
} from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

function formatTrackPositions(trackPositions: ReleaseTrackPosition[]) {
	const showDisc = trackPositions.some((position) => position.disc_number !== 1)
	return trackPositions
		.map((position) => {
			if (!position.track_number) return `Disc ${position.disc_number}`
			if (!showDisc) return `Track ${position.track_number}`
			return formatTrackPosition(
				{ index: position.disc_number },
				position.track_number,
			)
		})
		.join(showDisc ? " " : ", ")
}

const itemStyles = stylex.create({
	root: {
		display: "grid",
		gridTemplateColumns: `${px[64]} minmax(0, 1fr) max-content`,
		columnGap: px[16],
		rowGap: px[8],
		alignItems: "start",
		minWidth: 0,
		paddingBlock: px[16],
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[300],
	},
	thumbnail: { gridColumn: "1", gridRow: "1", borderRadius: radius.sm },
	title: { fontSize: fontSizes.base, lineHeight: lineHeights.base },
	content: { gridColumn: "2", gridRow: "1", display: "grid", minWidth: 0 },
	kind: {
		gridColumn: "3",
		gridRow: "1",
		justifySelf: "end",
	},
	description: {
		gridColumn: "2",
		color: colors.textTertiary,
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere",
	},

	metadata: {
		display: "grid",
		gridAutoRows: `minmax(${px[20]}, auto)`,
		overflowWrap: "anywhere",
	},
	date: { whiteSpace: "nowrap" },
})

function RelationRelease(props: {
	release: SongRelation["song"]["release"]
	artists: SongRelation["song"]["artists"]
}) {
	const { t } = useLingui()
	const positions = () =>
		formatTrackPositions(props.release?.track_positions ?? [])
	return (
		<div {...stylex.attrs(copyStyles.sm, itemStyles.metadata)}>
			<Show when={Boolean(props.release) || props.artists.length > 0}>
				<div>
					<Show when={props.release}>
						{(release) => (
							<>
								<Link
									to="/release/$id"
									params={{ id: release().id.toString() }}
									class={
										stylex.attrs(link.base, link.withUnderline, link.secondary)
											.class
									}
								>
									{release().title}
								</Link>
								<Show when={props.artists.length > 0}>{" - "}</Show>
							</>
						)}
					</Show>
					<Intersperse
						of={props.artists}
						with={", "}
					>
						{(artist) => (
							<Link
								to="/artist/$id"
								params={{ id: artist.id.toString() }}
								class={
									stylex.attrs(link.base, link.withUnderline, link.secondary)
										.class
								}
							>
								{artist.name}
							</Link>
						)}
					</Intersperse>
				</div>
			</Show>
			<Show when={props.release}>
				<div>
					<Show when={positions()}>
						{(value) => (
							<>
								<span>{value()}</span>
								{" · "}
							</>
						)}
					</Show>
					<Show
						when={props.release?.release_date}
						fallback={
							<span {...stylex.attrs(itemStyles.date)}>{t`Unknown date`}</span>
						}
					>
						{(date) => (
							<time
								{...stylex.attrs(itemStyles.date)}
								dateTime={DateWithPrecision.display(date())}
							>
								{DateWithPrecision.display(date())}
							</time>
						)}
					</Show>
				</div>
			</Show>
		</div>
	)
}

export function SongRelationItem(props: { relation: SongRelation }) {
	return (
		<li {...stylex.attrs(itemStyles.root)}>
			<Thumbnail
				src={imgUrl(props.relation.song.release?.cover_art_url, 8)}
				to="/song/$id"
				params={{ id: props.relation.song.id.toString() }}
				aria-label={props.relation.song.title}
				styles={itemStyles.thumbnail}
			/>
			<div {...stylex.attrs(itemStyles.content)}>
				<Link
					to="/song/$id"
					params={{ id: props.relation.song.id.toString() }}
					{...stylex.attrs(
						link.base,
						link.withUnderline,
						itemStyles.title,
						textStyles.ellipsis,
					)}
				>
					{props.relation.song.title}
				</Link>
				<RelationRelease
					release={props.relation.song.release}
					artists={props.relation.song.artists}
				/>
			</div>
			<Badge styles={itemStyles.kind}>{props.relation.type}</Badge>
			<Show when={props.relation.description}>
				<p {...stylex.attrs(copyStyles.sm, itemStyles.description)}>
					{props.relation.description}
				</p>
			</Show>
		</li>
	)
}
