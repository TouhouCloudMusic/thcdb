import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { ArrowDownIcon, ArrowUpIcon } from "@thc/icons/radix"
import { Match, Show, Switch } from "solid-js"

import { AlertDialog } from "~/component/dialog/AlertDialog"
import { Image } from "~/component/image"
import { DateWithPrecision } from "~/domain/shared"
import type {
	ArtistSummary,
	EntitySummary,
	EventSummary,
	LabelSummary,
	PageResponseUserCollectionItemDetail,
	ReleaseSummary,
	SimpleArtist,
	SongSummary,
	TagSummary,
} from "~/hey-api"
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
	entityLink: {
		display: "flex",
		alignItems: "center",
		gap: px[16],
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	artistImage: {
		height: px[48],
		width: px[48],
		flexShrink: 0,
		overflow: "hidden",
		borderRadius: radius.full,
		backgroundColor: palette.slate[100],
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[200],
	},
	img: { height: "100%", width: "100%", objectFit: "cover" },
	entitySummary: { display: "flex", minWidth: 0, flexDirection: "column" },
	entityName: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontWeight: 500,
		color: {
			default: palette.slate[900],
			"@media (hover: hover)": {
				default: null,
				[stylex.when.ancestor(":hover")]: palette.blue[600],
			},
		},
	},
	entityMetadata: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
	coverImage: {
		height: px[48],
		width: px[48],
		flexShrink: 0,
		overflow: "hidden",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[200],
	},
	artistNames: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 1,
	},
	textEntityLink: {
		display: "block",
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	textEntitySummary: { display: "flex", flexDirection: "column" },
	textEntityName: {
		overflowWrap: "break-word",
		fontWeight: 500,
		color: {
			default: palette.slate[900],
			"@media (hover: hover)": {
				default: null,
				[stylex.when.ancestor(":hover")]: palette.blue[600],
			},
		},
	},
	missingEntity: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	item: {
		borderRadius: radius.sm,
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
		paddingTop: px[16],
		paddingRight: px[16],
		paddingBottom: px[16],
		paddingLeft: px[16],
		boxShadow: {
			default: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
			":hover": {
				default: null,
				"@media (hover: hover)":
					"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
			},
		},
		transitionProperty: "box-shadow",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
	},
	body: { display: "flex", flexDirection: "column", gap: px[12] },
	header: { display: "flex", alignItems: "center", gap: px[12] },
	position: {
		display: "flex",
		height: px[24],
		width: px[24],
		flexShrink: 0,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.full,
		backgroundColor: palette.slate[100],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: colors.textTertiary,
	},
	entityType: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	reorderActions: {
		marginLeft: "auto",
		display: "flex",
		flexShrink: 0,
		alignItems: "center",
		gap: px[4],
	},
	moveAction: {
		display: "grid",
		width: px[28],
		height: px[28],
		placeItems: "center",
		borderRadius: radius.sm,
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: {
			default: palette.white,
			":hover": { default: null, "@media (hover: hover)": palette.slate[100] },
		},
		color: {
			default: colors.textTertiary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
		},
		pointerEvents: { default: null, ":disabled": "none" },
		opacity: { default: null, ":disabled": 0.35 },
		outlineStyle: {
			default: null,
			":focus": "none",
			":focus-visible": "solid",
		},
		outlineWidth: { default: null, ":focus-visible": "1px" },
		outlineColor: { default: null, ":focus-visible": palette.slate[500] },
	},
	moveIcon: { width: px[14], height: px[14] },
	entityContent: { marginLeft: px[36] },
	footer: {
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		marginTop: px[12],
		display: "flex",
		flexWrap: "wrap",
		alignItems: "flex-start",
		columnGap: px[16],
		rowGap: px[12],
		borderColor: palette.slate[100],
		paddingTop: px[12],
	},
	description: {
		minWidth: 0,
		flex: "1",
		flexBasis: px[256],
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	deleteAction: {
		marginLeft: "auto",
		alignSelf: "flex-end",
		flexShrink: 0,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
		opacity: { default: null, ":disabled": 0.5 },
		outlineStyle: { default: null, ":focus": "none" },
	},
})

export type UserCollectionItemDetail =
	PageResponseUserCollectionItemDetail["items"][number]

type Props = {
	item: UserCollectionItemDetail
	number: number
	isEditing: boolean
	isDeleting: boolean
	isReordering: boolean
	canMoveUp: boolean
	canMoveDown: boolean
	onDelete: () => void
	onMoveUp: () => void
	onMoveDown: () => void
}

function ArtistCard(props: { id: number; summary: ArtistSummary }) {
	return (
		<Link
			to="/artist/$id"
			params={{ id: props.id.toString() }}
			class={
				stylex.attrs(
					link.base,
					link.text,
					stylex.defaultMarker(),
					styles.entityLink,
				).class
			}
		>
			<div {...stylex.attrs(styles.artistImage)}>
				<Image.Root>
					<Show when={props.summary.profile_image_url}>
						{(url) => (
							<Image.Img
								src={imgUrl(url())}
								styles={styles.img}
							/>
						)}
					</Show>
				</Image.Root>
			</div>
			<div {...stylex.attrs(styles.entitySummary)}>
				<span {...stylex.attrs(styles.entityName)}>{props.summary.name}</span>
				<span {...stylex.attrs(styles.entityMetadata)}>
					{props.summary.artist_type}
				</span>
			</div>
		</Link>
	)
}

function ReleaseCard(props: { id: number; summary: ReleaseSummary }) {
	const artistNames = () =>
		props.summary.artists?.map((a: SimpleArtist) => a.name).join(", ")

	return (
		<Link
			to="/release/$id"
			params={{ id: props.id.toString() }}
			class={
				stylex.attrs(
					link.base,
					link.text,
					stylex.defaultMarker(),
					styles.entityLink,
				).class
			}
		>
			<div {...stylex.attrs(styles.coverImage)}>
				<Image.Root>
					<Show when={props.summary.cover_art_url}>
						{(url) => (
							<Image.Img
								src={imgUrl(url())}
								styles={styles.img}
							/>
						)}
					</Show>
				</Image.Root>
			</div>
			<div {...stylex.attrs(styles.entitySummary)}>
				<span {...stylex.attrs(styles.entityName)}>{props.summary.title}</span>
				<Show when={artistNames()}>
					{(names) => (
						<span {...stylex.attrs(styles.artistNames)}>{names()}</span>
					)}
				</Show>
				<Show when={props.summary.release_date}>
					{(date) => (
						<span {...stylex.attrs(styles.entityMetadata)}>
							{DateWithPrecision.display(date())}
						</span>
					)}
				</Show>
			</div>
		</Link>
	)
}

function SongCard(props: { id: number; summary: SongSummary }) {
	const artistNames = () =>
		props.summary.artists?.map((a: SimpleArtist) => a.name).join(", ")

	return (
		<Link
			to="/song/$id"
			params={{ id: props.id.toString() }}
			class={
				stylex.attrs(
					link.base,
					link.text,
					stylex.defaultMarker(),
					styles.entityLink,
				).class
			}
		>
			<div {...stylex.attrs(styles.coverImage)}>
				<Image.Root>
					<Show when={props.summary.cover_art_url}>
						{(url) => (
							<Image.Img
								src={imgUrl(url())}
								styles={styles.img}
							/>
						)}
					</Show>
				</Image.Root>
			</div>
			<div {...stylex.attrs(styles.entitySummary)}>
				<span {...stylex.attrs(styles.entityName)}>{props.summary.title}</span>
				<Show when={artistNames()}>
					{(names) => (
						<span {...stylex.attrs(styles.artistNames)}>{names()}</span>
					)}
				</Show>
			</div>
		</Link>
	)
}

function TagCard(props: { id: number; summary: TagSummary }) {
	return (
		<Link
			to="/tag/$id"
			params={{ id: props.id.toString() }}
			class={
				stylex.attrs(
					link.base,
					link.text,
					stylex.defaultMarker(),
					styles.textEntityLink,
				).class
			}
		>
			<div {...stylex.attrs(styles.textEntitySummary)}>
				<span {...stylex.attrs(styles.textEntityName)}>
					{props.summary.name}
				</span>
				<span {...stylex.attrs(styles.entityMetadata)}>
					{props.summary.tag_type}
				</span>
			</div>
		</Link>
	)
}

function EventCard(props: { id: number; summary: EventSummary }) {
	return (
		<Link
			to="/event/$id"
			params={{ id: props.id.toString() }}
			class={
				stylex.attrs(
					link.base,
					link.text,
					stylex.defaultMarker(),
					styles.textEntityLink,
				).class
			}
		>
			<div {...stylex.attrs(styles.textEntitySummary)}>
				<span {...stylex.attrs(styles.textEntityName)}>
					{props.summary.name}
				</span>
				<Show when={props.summary.start_date}>
					{(date) => (
						<span {...stylex.attrs(styles.entityMetadata)}>
							{DateWithPrecision.display(date())}
						</span>
					)}
				</Show>
			</div>
		</Link>
	)
}

function LabelCard(props: { id: number; summary: LabelSummary }) {
	return (
		<Link
			to="/label/$id"
			params={{ id: props.id.toString() }}
			class={
				stylex.attrs(
					link.base,
					link.text,
					stylex.defaultMarker(),
					styles.textEntityLink,
				).class
			}
		>
			<span {...stylex.attrs(styles.textEntityName)}>{props.summary.name}</span>
		</Link>
	)
}

function EntityContent(props: { summary: EntitySummary }) {
	return (
		<Switch
			fallback={
				<span {...stylex.attrs(styles.missingEntity)}>#{props.summary.id}</span>
			}
		>
			<Match
				keyed
				when={props.summary.entity_type === "Artist" && props.summary}
			>
				{(summary) => (
					<ArtistCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Release" && props.summary}
			>
				{(summary) => (
					<ReleaseCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Song" && props.summary}
			>
				{(summary) => (
					<SongCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Tag" && props.summary}
			>
				{(summary) => (
					<TagCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Event" && props.summary}
			>
				{(summary) => (
					<EventCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
			<Match
				keyed
				when={props.summary.entity_type === "Label" && props.summary}
			>
				{(summary) => (
					<LabelCard
						id={summary.id}
						summary={summary}
					/>
				)}
			</Match>
		</Switch>
	)
}

export function CollectionItemCard(props: Props) {
	const { t } = useLingui()
	const entityTypeLabel = () => {
		switch (props.item.entity_type) {
			case "Artist": {
				return t`Artist`
			}
			case "Label": {
				return t`Label`
			}
			case "Release": {
				return t`Release`
			}
			case "Song": {
				return t`Song`
			}
			case "Tag": {
				return t`Tag`
			}
			case "Event": {
				return t`Event`
			}
			case "CreditRole": {
				return t`Credit role`
			}
			case "SongLyrics": {
				return t`Song lyrics`
			}
		}
	}
	return (
		<li {...stylex.attrs(styles.item)}>
			<div {...stylex.attrs(styles.body)}>
				<div {...stylex.attrs(styles.header)}>
					<span {...stylex.attrs(styles.position)}>{props.number}</span>
					{/* Entity type label */}
					<span {...stylex.attrs(styles.entityType)}>{entityTypeLabel()}</span>
					<Show when={props.isEditing}>
						<div {...stylex.attrs(styles.reorderActions)}>
							<button
								type="button"
								{...stylex.attrs(styles.moveAction)}
								aria-label={t`Move item up`}
								title={t`Move item up`}
								disabled={props.isReordering || !props.canMoveUp}
								onClick={() => props.onMoveUp()}
							>
								<ArrowUpIcon {...stylex.attrs(styles.moveIcon)} />
							</button>
							<button
								type="button"
								{...stylex.attrs(styles.moveAction)}
								aria-label={t`Move item down`}
								title={t`Move item down`}
								disabled={props.isReordering || !props.canMoveDown}
								onClick={() => props.onMoveDown()}
							>
								<ArrowDownIcon {...stylex.attrs(styles.moveIcon)} />
							</button>
						</div>
					</Show>
				</div>

				<div {...stylex.attrs(styles.entityContent)}>
					<Show
						when={props.item.entity}
						fallback={
							<span {...stylex.attrs(styles.missingEntity)}>
								#{props.item.entity_id}
							</span>
						}
					>
						{(summary) => <EntityContent summary={summary()} />}
					</Show>

					{/* Description + Remove row */}
					<Show when={props.item.description || props.isEditing}>
						<div {...stylex.attrs(styles.footer)}>
							<Show when={props.item.description}>
								<p {...stylex.attrs(styles.description)}>
									{props.item.description}
								</p>
							</Show>

							<Show when={props.isEditing}>
								<AlertDialog
									title={t`Remove from collection`}
									description={t`Are you sure you want to remove this item from the collection?`}
									confirmText={t`Remove`}
									onCancel={() => undefined}
									onConfirm={props.onDelete}
									triggerAs={(triggerProps) => (
										<button
											{...triggerProps}
											{...stylex.attrs(styles.deleteAction)}
											disabled={props.isDeleting}
										>
											{t`Remove`}
										</button>
									)}
								/>
							</Show>
						</div>
					</Show>
				</div>
			</div>
		</li>
	)
}
