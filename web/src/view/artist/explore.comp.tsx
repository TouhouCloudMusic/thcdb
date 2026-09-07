import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Show } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Select } from "~/component/atomic/form/select"
import { Intersperse } from "~/component/data/Intersperse"
import {
	CorrectionSortFieldSelect,
	EmptyExplorePlaceholder,
	ExploreFilterBar,
	ExploreFilterField,
	OrderBySelect,
} from "~/component/feature/entity_explore"
import { ARTIST_TYPES } from "~/domain/artist/constants"
import type { ArtistListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles } from "~/style/primitives"
import { radius, colors, px } from "~/style/tokens.stylex"

import { animationStyles } from "../../style/animations.stylex"
import { ArtistItem } from "./ArtistItem"
import { ArtistTypeLabel } from "./ArtistTypeLabel"

const styles = stylex.create({
	resultRow: {
		display: "grid",
		gridTemplateColumns: "3lh minmax(0,1fr)",
		alignItems: "flex-start",
		gap: px[12],
		lineHeight: "1.5rem",
	},
	avatarPlaceholder: {
		aspectRatio: "1 / 1",
		borderRadius: radius.full,
		backgroundColor: palette.slate[200],
	},
	summary: {
		display: "flex",
		flexDirection: "column",
		justifyContent: "space-between",
		gap: px[8],
		alignSelf: "stretch",
	},
	namePlaceholder: {
		height: px[20],
		width: "50%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	detailPlaceholder: {
		height: px[16],
		width: "66.66666666666666%",
		borderRadius: radius.sm,
		backgroundColor: colors.backgroundSecondary,
	},
	filterTrigger: {
		height: px[40],
		width: "100%",
	},
	results: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
	pagination: {
		display: "flex",
		justifyContent: "center",
		paddingBlock: px[24],
	},
})

export function ArtistItemSkeleton() {
	return (
		<div {...stylex.attrs(styles.resultRow, animationStyles.pulse)}>
			<div {...stylex.attrs(styles.avatarPlaceholder)}></div>
			<div {...stylex.attrs(styles.summary)}>
				<div {...stylex.attrs(styles.namePlaceholder)}></div>
				<div {...stylex.attrs(styles.detailPlaceholder)}></div>
			</div>
		</div>
	)
}

type ArtistExploreFilterBarProps = {
	artistTypeValue: "" | ArtistListItem["artist_type"]
	onArtistTypeChange: (value: "" | ArtistListItem["artist_type"]) => void
	sortBy: "created_at" | "updated_at" | undefined
	onSortByChange: (value: "created_at" | "updated_at") => void
	orderBy: "asc" | "desc" | undefined
	onOrderByChange: (value: "asc" | "desc") => void
}

export function ArtistExploreFilterBar(props: ArtistExploreFilterBarProps) {
	const { t } = useLingui()

	return (
		<ExploreFilterBar>
			<ExploreFilterField label={t`Type`}>
				<Select.Root<"" | ArtistListItem["artist_type"]>
					options={["", ...ARTIST_TYPES]}
					value={props.artistTypeValue}
					onChange={(value) => props.onArtistTypeChange(value ?? "")}
					placeholder={t`All`}
					itemComponent={(optionProps) => (
						<Select.Item item={optionProps.item}>
							<ArtistTypeLabel value={optionProps.item.rawValue} />
						</Select.Item>
					)}
				>
					<Select.Trigger styles={[styles.filterTrigger]}>
						<Select.Value<"" | ArtistListItem["artist_type"]>>
							{(state) => <ArtistTypeLabel value={state.selectedOption()} />}
						</Select.Value>
						<Select.Icon />
					</Select.Trigger>
					<Select.Portal>
						<Select.Content>
							<Select.Listbox />
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			</ExploreFilterField>

			<CorrectionSortFieldSelect
				value={props.sortBy}
				onChange={props.onSortByChange}
			/>

			<OrderBySelect
				value={props.orderBy}
				onChange={props.onOrderByChange}
			/>
		</ExploreFilterBar>
	)
}

type ArtistExploreListProps = {
	artists: ArtistListItem[]
	isLoading: boolean
	isFetching: boolean
	limit: number
	page: number
	totalPages: number
	onPageChange: (page: number) => void
}

export function ArtistExploreList(props: ArtistExploreListProps) {
	const { t } = useLingui()
	return (
		<>
			<Show when={!props.isLoading && props.artists.length === 0}>
				<EmptyExplorePlaceholder
					title={t`No artists found`}
					action={{ to: "/artist/new" }}
				/>
			</Show>

			<Show
				when={props.artists.length > 0 || props.isFetching || props.isLoading}
			>
				<div {...stylex.attrs(styles.results)}>
					<Intersperse
						of={props.artists}
						with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
					>
						{(artist) => <ArtistItem artist={artist} />}
					</Intersperse>
					<Show when={props.isFetching || props.isLoading}>
						<Show when={props.artists.length > 0}>
							<span {...stylex.attrs(dividerStyles.horizontal)}></span>
						</Show>
						<Intersperse
							of={Array.from({ length: props.limit })}
							with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
						>
							{() => <ArtistItemSkeleton />}
						</Intersperse>
					</Show>
				</div>
			</Show>

			<Show when={props.totalPages > 1}>
				<div {...stylex.attrs(styles.pagination)}>
					<Pagination
						current={props.page}
						total={props.totalPages}
						onPageChange={props.onPageChange}
					/>
				</div>
			</Show>
		</>
	)
}
