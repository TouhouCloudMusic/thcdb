import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { SongRelation } from "@thc/api"
import { createMemo, Show } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

import { toSongInfoRelationItemData } from "./SongInfoRelations.data"

const styles = stylex.create({
	relation: {
		display: "flex",
		flexDirection: "column",
		gap: px[4],
		borderTopWidth: {
			default: null,
			":not(:first-child)": 1,
		},
		borderTopStyle: {
			default: null,
			":not(:first-child)": "solid",
		},
		borderColor: palette.slate[300],
		paddingTop: {
			default: null,
			":not(:first-child)": px[12],
		},
	},
	heading: {
		display: "flex",
		gap: px[12],
		alignItems: "center",
	},
	relationType: {
		borderRadius: radius.full,
		backgroundColor: colors.backgroundSecondary,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: palette.slate[300],
		paddingInline: px[8],
		paddingBlock: px[2],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textSecondary,
	},
	details: {
		display: "flex",
		minWidth: 0,
		flexDirection: "column",
		gap: px[4],
	},
	artist: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 300,
		color: colors.textSecondary,
	},
	description: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
		whiteSpace: "pre-wrap",
	},
	relations: {
		marginTop: px[16],
		paddingInline: px[16],
	},
	list: {
		display: "flex",
		width: "100%",
		flexDirection: "column",
		gap: px[12],
	},
})

type SongInfoRelationItemProps = {
	relation: SongRelation
}

function SongInfoRelationItem(props: SongInfoRelationItemProps) {
	const relation = createMemo(() => toSongInfoRelationItemData(props.relation))

	return (
		<li {...stylex.attrs(styles.relation)}>
			<div {...stylex.attrs(styles.heading)}>
				<Link
					class={stylex.attrs(link.base, link.text).class}
					to="/song/$id"
					params={{ id: relation().songId }}
				>
					{relation().songTitle}
				</Link>
				<span {...stylex.attrs(styles.relationType)}>
					{relation().relationTypeName}
				</span>
			</div>
			<div {...stylex.attrs(styles.details)}>
				<Show when={relation().artist}>
					{(artist) => (
						<Link
							to="/artist/$id"
							params={{ id: artist().id }}
							class={stylex.attrs(link.base, link.text, styles.artist).class}
						>
							{artist().name}
						</Link>
					)}
				</Show>
			</div>
			<Show when={relation().description}>
				{(desc) => <p {...stylex.attrs(styles.description)}>{desc()}</p>}
			</Show>
		</li>
	)
}

type SongInfoRelationsProps = {
	relations: SongRelation[]
}

export function SongInfoRelations(props: SongInfoRelationsProps) {
	return (
		<div {...stylex.attrs(styles.relations)}>
			<ul {...stylex.attrs(styles.list)}>
				{props.relations.map((relation) => (
					<SongInfoRelationItem relation={relation} />
				))}
			</ul>
		</div>
	)
}
