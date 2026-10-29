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
import type { ArtistListItem, ArtistType, SortDirection } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles } from "~/style/primitives"
import { radius, colors, px } from "~/style/tokens.stylex"

import { animationStyles } from "../../style/animations.stylex"
import { ArtistItem } from "./ArtistItem"

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
	artistTypeValue: ArtistType | undefined
	onArtistTypeChange: (value: ArtistType | undefined) => void
	sortBy: "created_at" | "updated_at" | undefined
	onSortByChange: (value: "created_at" | "updated_at") => void
	orderBy: SortDirection | undefined
	onOrderByChange: (value: SortDirection) => void
}

type ArtistTypeOption = {
	value?: ArtistType
	key: string
	label: string
}

export function ArtistExploreFilterBar(props: ArtistExploreFilterBarProps) {
	const { t } = useLingui()
	const artistTypeText = (value: ArtistType) => {
		switch (value) {
			case "Solo": {
				return t`Solo Artist`
			}
			case "Multiple": {
				return t`Group`
			}
			case "Unknown": {
				return t`Unknown`
			}
		}
	}

	const artistTypeOptions = (): ArtistTypeOption[] => [
		{ value: undefined, key: "all", label: t`All` },
		...ARTIST_TYPES.map((value) => ({
			value,
			key: value,
			label: artistTypeText(value),
		})),
	]

	const selectedArtistType = () =>
		artistTypeOptions().find((option) => option.value === props.artistTypeValue)

	const changeArtistType = (option: ArtistTypeOption | undefined) =>
		props.onArtistTypeChange(option?.value)

	return (
		<ExploreFilterBar>
			<ExploreFilterField label={t`Type`}>
				<Select.Root
					options={artistTypeOptions()}
					value={selectedArtistType()}
					optionValue="key"
					optionTextValue="label"
					onChange={changeArtistType}
				>
					<Select.Trigger
						styles={styles.filterTrigger}
						aria-label={t`Type`}
					/>
					<Select.Content />
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
