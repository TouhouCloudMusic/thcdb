import type { LocalizedTitle, Release } from "@thc/api"
import type { Component } from "solid-js"
import { For, Show } from "solid-js"

import { Link } from "~/component/atomic"
import { Select } from "~/component/atomic/form/select"
import {
	CorrectionSortFieldSelect,
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { RELEASE_TYPES } from "~/domain/release/constants"
import { DateWithPrecision } from "~/domain/shared"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"

const getLocalizedTitle = (
	titles: LocalizedTitle[] | null | undefined,
	locale: string,
) => {
	return titles?.find((t) => t.language.code === locale)?.title
}

const ReleaseItemSkeleton: Component = () => (
	<div class="animate-pulse border-b border-slate-200 py-4">
		<div class="flex gap-3">
			<div class="h-14 w-14 shrink-0 rounded-md border border-slate-200 bg-slate-100" />
			<div class="min-w-0 flex-1">
				<div class="mb-2 h-5 w-2/3 rounded bg-slate-200" />
				<div class="h-4 w-1/2 rounded bg-slate-100" />
			</div>
		</div>
	</div>
)

type ReleaseMetaProps = {
	release: Release
}

function ReleaseMeta(props: ReleaseMetaProps) {
	const artists = () => props.release.artists ?? []
	const visibleArtists = () => artists().slice(0, 2)
	const remainingArtists = () =>
		Math.max(0, artists().length - visibleArtists().length)

	const releaseDate = () =>
		DateWithPrecision.display(props.release.release_date)

	const catalogNumbers = () => {
		const catalogs = props.release.catalog_nums ?? []
		const values = catalogs.slice(0, 2).map((c) => c.catalog_number)
		const hiddenCount = Math.max(0, catalogs.length - values.length)
		const suffix = 0 < hiddenCount ? ` +${hiddenCount}` : ""
		return 0 < values.length ? `${values.join(", ")}${suffix}` : undefined
	}

	const firstEvent = () => props.release.events?.[0]

	return (
		<div class="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
			<Show when={0 < artists().length}>
				<For each={visibleArtists()}>
					{(artist, idx) => (
						<>
							<Link
								to="/artist/$id"
								params={{ id: artist.id.toString() }}
								class="text-slate-500 no-underline hover:underline"
							>
								{artist.name}
							</Link>
							<Show when={idx() < visibleArtists().length - 1}>
								<span class="text-slate-300">,</span>
							</Show>
						</>
					)}
				</For>
				<Show when={0 < remainingArtists()}>
					<span class="text-slate-400">+{remainingArtists()}</span>
				</Show>
			</Show>

			<Show when={releaseDate()}>
				<span class="text-slate-300">·</span>
				<span>{releaseDate()}</span>
			</Show>

			<Show when={catalogNumbers()}>
				<span class="text-slate-300">·</span>
				<span class="truncate">#{catalogNumbers()}</span>
			</Show>

			<Show when={firstEvent()}>
				{(event) => (
					<>
						<span class="text-slate-300">·</span>
						<Link
							to="/event/$id"
							params={{ id: event().id.toString() }}
							class="truncate text-slate-500 no-underline hover:underline"
						>
							{event().name}
						</Link>
					</>
				)}
			</Show>
		</div>
	)
}

type ReleaseItemProps = {
	release: Release
	locale: string
}

const ReleaseItem: Component<ReleaseItemProps> = (props) => {
	const localizedTitle = () =>
		getLocalizedTitle(props.release.localized_titles, props.locale)

	const displayTitle = () => localizedTitle() ?? props.release.title
	const originalTitle = () =>
		localizedTitle() ? props.release.title : undefined

	return (
		<div class="border-b border-slate-200 py-4 last:border-b-0">
			<div class="hover:bg-slate-50 -mx-2 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-slate-200">
				<div class="flex gap-3">
					<Link
						to="/release/$id"
						params={{ id: props.release.id.toString() }}
						class="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 no-underline"
					>
						<Show when={props.release.cover_art_url}>
							{(src) => (
								<img
									src={src()}
									alt=""
									class="h-full w-full object-cover"
									loading="lazy"
								/>
							)}
						</Show>
					</Link>

					<div class="min-w-0 flex-1">
						<div class="flex min-w-0 items-baseline gap-2">
							<Link
								to="/release/$id"
								params={{ id: props.release.id.toString() }}
								class="truncate text-slate-900 no-underline hover:underline"
							>
								{displayTitle()}
							</Link>
							<Show when={originalTitle()}>
								<span class="truncate text-sm text-slate-400">
									{originalTitle()}
								</span>
							</Show>
							<span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
								{props.release.release_type}
							</span>
						</div>

						<ReleaseMeta release={props.release} />
					</div>
				</div>
			</div>
		</div>
	)
}

export type ReleaseExploreFilterBarProps = {
	scrollDirection: () => ScrollDirection
	releaseType: string
	sortBy: "created_at" | "handled_at" | undefined
	orderBy: "asc" | "desc" | undefined
	onReleaseTypeChange: (value: string) => void
	onSortByChange: (value: "created_at" | "handled_at") => void
	onOrderByChange: (value: "asc" | "desc") => void
}

export function ReleaseExploreFilterBar(props: ReleaseExploreFilterBarProps) {
	return (
		<StickyFilterBar scrollDirection={props.scrollDirection}>
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-500">Type</span>
					<Select
						value={props.releaseType}
						onChange={(e) => props.onReleaseTypeChange(e.currentTarget.value)}
					>
						<Select.Option value="">All</Select.Option>
						<For each={RELEASE_TYPES}>
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

export type ReleaseExploreListProps = {
	releases: Release[]
	locale: string
	isLoading: boolean
	isFetchingNextPage: boolean
	hasNextPage: boolean
	limit: number
	setSentinelRef: (el: HTMLDivElement | undefined) => void
}

export function ReleaseExploreList(props: ReleaseExploreListProps) {
	return (
		<>
			<Show when={!props.isLoading && 0 === props.releases.length}>
				<div class="py-8 text-sm text-slate-400">No releases</div>
			</Show>

			<div class="flex flex-col">
				<For each={props.releases}>
					{(release) => (
						<ReleaseItem
							release={release}
							locale={props.locale}
						/>
					)}
				</For>
			</div>

			<div
				ref={props.setSentinelRef}
				class="h-1"
			/>

			<Show when={props.isFetchingNextPage || props.isLoading}>
				<div class="flex flex-col">
					<For each={Array.from({ length: props.limit })}>
						{() => <ReleaseItemSkeleton />}
					</For>
				</div>
			</Show>

			<Show when={!props.hasNextPage && 0 < props.releases.length}>
				<div class="flex justify-center py-4 text-sm text-slate-400">
					No more releases
				</div>
			</Show>
		</>
	)
}
