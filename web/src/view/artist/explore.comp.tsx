import { useLingui } from "@lingui/solid/macro"
import { Show } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Divider } from "~/component/atomic/Divider"
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

import { ArtistItem } from "./ArtistItem"
import { ArtistTypeLabel } from "./ArtistTypeLabel"

export function ArtistItemSkeleton() {
	return (
		<div class="animate-pulse grid grid-cols-[3lh_minmax(0,1fr)] items-start gap-3 leading-6">
			<div class="aspect-square rounded-full bg-slate-200"></div>
			<div class="flex flex-col justify-between gap-2 self-stretch">
				<div class="h-5 w-1/2 rounded bg-slate-200"></div>
				<div class="h-4 w-2/3 rounded bg-secondary"></div>
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
					<Select.Trigger class="h-10 w-full">
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
				<div class="flex flex-col gap-2 p-4">
					<Intersperse
						of={props.artists}
						with={<Divider horizontal />}
					>
						{(artist) => <ArtistItem artist={artist} />}
					</Intersperse>
					<Show when={props.isFetching || props.isLoading}>
						<Show when={props.artists.length > 0}>
							<Divider horizontal />
						</Show>
						<Intersperse
							of={Array.from({ length: props.limit })}
							with={<Divider horizontal />}
						>
							{() => <ArtistItemSkeleton />}
						</Intersperse>
					</Show>
				</div>
			</Show>

			<Show when={props.totalPages > 1}>
				<div class="flex justify-center py-6">
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
