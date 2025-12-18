import { useLingui } from "@lingui-solid/solid/macro"
import type { Artist } from "@thc/api"
import type { Component } from "solid-js"
import { For, Show } from "solid-js"

import { Link } from "~/component/atomic"
import { Select } from "~/component/atomic/form/select"
import {
	CorrectionSortFieldSelect,
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { ARTIST_TYPES } from "~/domain/artist/constants"
import { DateWithPrecision } from "~/domain/shared"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"

const getArtistAvatarText = (artist: Artist) => {
	const value = artist.name.trim()
	if (!value) return "?"
	return value.slice(0, 1).toUpperCase()
}

const formatArtistDateRange = (artist: Artist) => {
	const start = DateWithPrecision.display(artist.start_date) ?? "Unknown"
	const end = DateWithPrecision.display(artist.end_date) ?? "Present"
	return `${start} - ${end}`
}

const isDefinedString = (value: string | null | undefined): value is string => {
	return "string" === typeof value && 0 < value.length
}

const formatLocation = (value: Artist["current_location"] | undefined) => {
	if (!value) return
	const parts = [value.country, value.province, value.city].filter(
		isDefinedString,
	)
	if (0 === parts.length) return
	return parts.join(" / ")
}

export const ArtistItemSkeleton: Component = () => (
	<div class="animate-pulse border-b border-slate-200 py-4">
		<div class="flex gap-3">
			<div class="h-12 w-12 shrink-0 rounded-full bg-slate-200" />
			<div class="min-w-0 flex-1">
				<div class="mb-2 flex items-center gap-2">
					<div class="h-5 w-1/3 rounded bg-slate-200" />
					<div class="h-5 w-16 rounded bg-slate-100" />
				</div>
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<div class="h-4 w-36 rounded bg-slate-100" />
					<div class="h-4 w-32 rounded bg-slate-100" />
				</div>
				<div class="mt-2 flex flex-wrap items-center gap-1">
					<div class="h-4 w-24 rounded bg-slate-100" />
					<div class="h-4 w-28 rounded bg-slate-100" />
				</div>
			</div>
		</div>
	</div>
)

type ArtistItemProps = {
	artist: Artist
}

export const ArtistItem: Component<ArtistItemProps> = (props) => {
	const locationText = () => formatLocation(props.artist.current_location)
	const { i18n } = useLingui()

	const preferredLanguageCode = () => {
		const locale = i18n().locale
		return locale.split("-")[0] ?? locale
	}
	const preferredLocalizedName = () => {
		const list = props.artist.localized_names ?? []
		const target = preferredLanguageCode()
		const match = list.find((x) => x.language.code === target)
		const value = match?.name
		if (!value) return
		if (value === props.artist.name) return
		return value
	}

	return (
		<div class="border-b border-slate-200 py-4 last:border-b-0">
			<div class="flex gap-3">
				<Link
					to="/artist/$id"
					params={{ id: props.artist.id.toString() }}
					class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-medium text-slate-700 no-underline hover:border-slate-300 hover:no-underline focus-visible:ring-2 focus-visible:ring-slate-200"
				>
					<Show when={props.artist.profile_image_url}>
						{(src) => (
							<img
								src={src()}
								alt=""
								class="h-full w-full object-cover"
								loading="lazy"
							/>
						)}
					</Show>
					<Show when={!props.artist.profile_image_url}>
						{getArtistAvatarText(props.artist)}
					</Show>
				</Link>

				<div class="min-w-0 flex-1">
					<div class="flex min-w-0 items-baseline justify-between gap-3">
						<div class="flex min-w-0 items-baseline gap-2">
							<Link
								to="/artist/$id"
								params={{ id: props.artist.id.toString() }}
								class="truncate text-slate-900 no-underline decoration-slate-300 underline-offset-2 hover:underline"
							>
								{props.artist.name}
							</Link>
							<Show when={preferredLocalizedName()}>
								{(value) => (
									<span class="truncate text-sm text-slate-500">{value()}</span>
								)}
							</Show>
						</div>

						<div class="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
							{props.artist.artist_type}
						</div>
					</div>

					<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
						<span>{formatArtistDateRange(props.artist)}</span>
						<Show when={locationText()}>
							<span class="text-slate-300">·</span>
							<span>{locationText()}</span>
						</Show>
					</div>
				</div>
			</div>
		</div>
	)
}

type ArtistExploreFilterBarProps = {
	scrollDirection: () => ScrollDirection
	artistTypeValue: string
	onArtistTypeChange: (value: string) => void
	sortBy: "created_at" | "handled_at" | undefined
	onSortByChange: (value: "created_at" | "handled_at") => void
	orderBy: "asc" | "desc" | undefined
	onOrderByChange: (value: "asc" | "desc") => void
}

export const ArtistExploreFilterBar: Component<ArtistExploreFilterBarProps> = (
	props,
) => {
	return (
		<StickyFilterBar scrollDirection={props.scrollDirection}>
			<div class="flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-500">Type</span>
					<Select
						value={props.artistTypeValue}
						onChange={(e) => props.onArtistTypeChange(e.currentTarget.value)}
					>
						<Select.Option value="">All</Select.Option>
						<For each={ARTIST_TYPES}>
							{(type) => <Select.Option value={type}>{type}</Select.Option>}
						</For>
					</Select>
				</div>

				<CorrectionSortFieldSelect
					value={props.sortBy}
					onChange={props.onSortByChange}
				/>

				<OrderBySelect
					value={props.orderBy}
					onChange={props.onOrderByChange}
				/>
			</div>
		</StickyFilterBar>
	)
}

type ArtistExploreListProps = {
	artists: Artist[]
	isLoading: boolean
	isFetchingNextPage: boolean
	hasNextPage: boolean
	limit: number
	setSentinelRef: (el: HTMLDivElement) => void
}

export const ArtistExploreList: Component<ArtistExploreListProps> = (props) => {
	return (
		<>
			<Show when={!props.isLoading && 0 === props.artists.length}>
				<div class="py-8 text-sm text-slate-400">No artists</div>
			</Show>

			<div class="flex flex-col">
				<For each={props.artists}>
					{(artist) => <ArtistItem artist={artist} />}
				</For>
			</div>

			<div
				ref={props.setSentinelRef}
				class="h-1"
			/>

			<Show when={props.isFetchingNextPage || props.isLoading}>
				<div class="flex flex-col">
					<For each={Array.from({ length: props.limit })}>
						{() => <ArtistItemSkeleton />}
					</For>
				</div>
			</Show>

			<Show when={!props.hasNextPage && 0 < props.artists.length}>
				<div class="flex justify-center py-4 text-sm text-slate-400">
					No more artists
				</div>
			</Show>
		</>
	)
}
