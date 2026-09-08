import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { For, Match, Show, Switch } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Intersperse } from "~/component/data/Intersperse"
import { EmptyExplorePlaceholder } from "~/component/feature/entity_explore"
import type { ViewMode } from "~/component/feature/entity_explore"
import type { ReleaseListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles } from "~/style/primitives"
import { radius, colors, px } from "~/style/tokens.stylex"
import { ReleaseGridItem, ReleaseItem } from "~/view/release/ReleaseItems"

import { animationStyles } from "../../../style/animations.stylex"

const styles = stylex.create({
	listSkeleton: {
		display: "grid",
		gridTemplateColumns: "3lh minmax(0,1fr)",
		alignItems: "flex-start",
		gap: px[12],
		lineHeight: "1.5rem",
	},
	skeletonCover: {
		aspectRatio: "1 / 1",
		borderRadius: radius.sm,
		backgroundColor: colors.backgroundSecondary,
	},
	skeletonTitle: {
		marginBottom: px[8],
		height: px[20],
		width: "66.66666666666666%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonArtist: {
		height: px[16],
		width: "50%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	gridSkeletonCover: {
		aspectRatio: "1 / 1",
		borderRadius: radius.md,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: palette.slate[100],
	},
	gridSkeletonTitle: {
		marginTop: px[8],
		height: px[16],
		width: "75%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	gridSkeletonArtist: {
		marginTop: px[4],
		height: px[12],
		width: "50%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	list: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
	grid: {
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(2, minmax(0, 1fr))",
			"@media (min-width: 40rem)": "repeat(3, minmax(0, 1fr))",
			"@media (min-width: 48rem)": "repeat(4, minmax(0, 1fr))",
			"@media (min-width: 64rem)": "repeat(5, minmax(0, 1fr))",
			"@media (min-width: 80rem)": "repeat(5, minmax(0, 1fr))",
		},
		gap: px[8],
	},
	pagination: {
		display: "flex",
		justifyContent: "center",
		paddingBlock: px[24],
	},
})

function ReleaseItemSkeleton() {
	return (
		<div {...stylex.attrs(styles.listSkeleton, animationStyles.pulse)}>
			<div {...stylex.attrs(styles.skeletonCover)}></div>
			<div>
				<div {...stylex.attrs(styles.skeletonTitle)}></div>
				<div {...stylex.attrs(styles.skeletonArtist)}></div>
			</div>
		</div>
	)
}

function ReleaseGridItemSkeleton() {
	return (
		<div {...stylex.attrs(animationStyles.pulse)}>
			<div {...stylex.attrs(styles.gridSkeletonCover)}></div>
			<div {...stylex.attrs(styles.gridSkeletonTitle)}></div>
			<div {...stylex.attrs(styles.gridSkeletonArtist)}></div>
		</div>
	)
}

export type ReleaseExploreListSkeletonProps = {
	limit: number
	displayType: ViewMode
}

export function ReleaseExploreListSkeleton(
	props: ReleaseExploreListSkeletonProps,
) {
	return (
		<Switch>
			<Match when={props.displayType === "list"}>
				<div {...stylex.attrs(styles.list)}>
					<Intersperse
						of={Array.from({ length: props.limit })}
						with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
					>
						{() => <ReleaseItemSkeleton />}
					</Intersperse>
				</div>
			</Match>
			<Match when={props.displayType === "grid"}>
				<div {...stylex.attrs(styles.grid)}>
					<For each={Array.from({ length: props.limit })}>
						{() => <ReleaseGridItemSkeleton />}
					</For>
				</div>
			</Match>
		</Switch>
	)
}

export type ReleaseExploreListStore = {
	releases: ReleaseListItem[]
	isLoading: boolean
	limit: number
	page: number
	displayType: ViewMode
	totalPages: number
	setPage: (page: number) => void
}

export type ReleaseExploreListProps = {
	store: ReleaseExploreListStore
}

export function ReleaseExploreList(props: ReleaseExploreListProps) {
	const { t } = useLingui()
	return (
		<>
			<Show when={!props.store.isLoading && props.store.releases.length === 0}>
				<EmptyExplorePlaceholder
					title={t`No releases found`}
					action={{ to: "/release/new" }}
				/>
			</Show>

			<Switch>
				<Match when={props.store.displayType === "list"}>
					<Show when={props.store.releases.length > 0 || props.store.isLoading}>
						<div {...stylex.attrs(styles.list)}>
							<Intersperse
								of={props.store.releases}
								with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
							>
								{(release) => <ReleaseItem release={release} />}
							</Intersperse>
							<Show when={props.store.isLoading}>
								<Show when={props.store.releases.length > 0}>
									<span {...stylex.attrs(dividerStyles.horizontal)}></span>
								</Show>
								<Intersperse
									of={Array.from({ length: props.store.limit })}
									with={
										<span {...stylex.attrs(dividerStyles.horizontal)}></span>
									}
								>
									{() => <ReleaseItemSkeleton />}
								</Intersperse>
							</Show>
						</div>
					</Show>
				</Match>
				<Match when={props.store.displayType === "grid"}>
					<div {...stylex.attrs(styles.grid)}>
						<For each={props.store.releases}>
							{(release) => <ReleaseGridItem release={release} />}
						</For>
					</div>
				</Match>
			</Switch>

			<Show when={props.store.isLoading && props.store.displayType === "grid"}>
				<ReleaseExploreListSkeleton
					limit={props.store.limit}
					displayType={props.store.displayType}
				/>
			</Show>

			<Show when={props.store.totalPages > 1}>
				<div {...stylex.attrs(styles.pagination)}>
					<Pagination
						current={props.store.page}
						total={props.store.totalPages}
						onPageChange={props.store.setPage}
					/>
				</div>
			</Show>
		</>
	)
}
