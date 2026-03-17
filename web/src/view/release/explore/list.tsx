import { Link as RouterLink } from "@tanstack/solid-router"
import type { LocalizedTitle, Release } from "@thc/api"
import { For, Match, Show, Switch } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Link } from "~/component/atomic"
import { EmptyExplorePlaceholder } from "~/component/feature/entity_explore"
import { DateWithPrecision } from "~/domain/shared"
import { imgUrl } from "~/utils/adapter/static_file"

export type DisplayType = "wall" | "list"

function getLocalizedTitle(
	titles: LocalizedTitle[] | null | undefined,
	locale: string,
) {
	return titles?.find((t) => t.language.code === locale)?.title
}

const WALL_CONTAINER_CLASS =
	"grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5"

function ReleaseItemSkeleton() {
	return (
		<div class="animate-pulse border-b border-slate-200 py-4">
			<div class="flex gap-3">
				<div class="h-14 w-14 shrink-0 rounded-md border border-slate-200 bg-slate-100"></div>
				<div class="min-w-0 flex-1">
					<div class="mb-2 h-5 w-2/3 rounded bg-slate-200"></div>
					<div class="h-4 w-1/2 rounded bg-slate-100"></div>
				</div>
			</div>
		</div>
	)
}

function ReleaseWallItemSkeleton() {
	return (
		<div class="animate-pulse">
			<div class="aspect-square w-full rounded-md border border-slate-200 bg-slate-100"></div>
			<div class="mt-2 h-4 w-3/4 rounded bg-slate-200"></div>
			<div class="mt-1 h-3 w-1/2 rounded bg-slate-100"></div>
		</div>
	)
}

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
		const suffix = hiddenCount > 0 ? ` +${hiddenCount}` : ""
		return values.length > 0 ? `${values.join(", ")}${suffix}` : undefined
	}

	const firstEvent = () => props.release.events?.[0]

	return (
		<div class="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
			<Show when={artists().length > 0}>
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
				<Show when={remainingArtists() > 0}>
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

type ReleaseWallItemProps = {
	release: Release
	locale: string
}

function ReleaseWallItem(props: ReleaseWallItemProps) {
	const displayTitle = () =>
		getLocalizedTitle(props.release.localized_titles, props.locale)
		?? props.release.title

	const artists = () => props.release.artists ?? []
	const visibleArtists = () =>
		artists()
			.slice(0, 2)
			.map((a) => a.name)
	const remainingArtists = () =>
		Math.max(0, artists().length - visibleArtists().length)

	const artistText = () => {
		if (visibleArtists().length === 0) return
		const suffix = remainingArtists() > 0 ? ` +${remainingArtists()}` : ""
		return `${visibleArtists().join(", ")}${suffix}`
	}

	const releaseDate = () =>
		DateWithPrecision.display(props.release.release_date)
	const coverUrl = () => imgUrl(props.release.cover_art_url)

	return (
		<div>
			<RouterLink
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				class="block overflow-hidden rounded-md border border-slate-200 bg-slate-100 no-underline focus-visible:ring-2 focus-visible:ring-slate-200"
			>
				<div class="aspect-square">
					<Show
						when={coverUrl()}
						fallback={
							<div class="grid h-full w-full place-items-center text-xs text-slate-400 no-underline">
								No Cover Art
							</div>
						}
					>
						{(src) => (
							<img
								src={src()}
								alt=""
								class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
								loading="lazy"
							/>
						)}
					</Show>
				</div>
			</RouterLink>

			<div class="mt-2 min-w-0">
				<Link
					to="/release/$id"
					params={{ id: props.release.id.toString() }}
					class="block truncate text-sm text-slate-900 no-underline"
					title={displayTitle()}
				>
					{displayTitle()}
				</Link>

				<div class="mt-0.5 flex min-w-0 items-center justify-between gap-2 text-xs text-slate-500">
					<Show when={artistText()}>
						{(text) => <span class="min-w-0 truncate">{text()}</span>}
					</Show>
					<Show when={releaseDate()}>
						{(date) => <span class="shrink-0">{date()}</span>}
					</Show>
				</div>
			</div>
		</div>
	)
}

type ReleaseItemProps = {
	release: Release
	locale: string
}

function ReleaseItem(props: ReleaseItemProps) {
	const localizedTitle = () =>
		getLocalizedTitle(props.release.localized_titles, props.locale)

	const displayTitle = () => localizedTitle() ?? props.release.title
	const originalTitle = () =>
		localizedTitle() ? props.release.title : undefined
	const coverUrl = () => imgUrl(props.release.cover_art_url)

	return (
		<div class="border-b border-slate-200 py-4 last:border-b-0">
			<div class="hover:bg-slate-50 -mx-2 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-slate-200">
				<div class="flex gap-3">
					<Link
						to="/release/$id"
						params={{ id: props.release.id.toString() }}
						class="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 no-underline"
					>
						<Show when={coverUrl()}>
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

export type ReleaseExploreListSkeletonProps = {
	limit: number
	displayType: DisplayType
}

export function ReleaseExploreListSkeleton(
	props: ReleaseExploreListSkeletonProps,
) {
	return (
		<Switch>
			<Match when={props.displayType === "list"}>
				<div class="flex flex-col">
					<For each={Array.from({ length: props.limit })}>
						{() => <ReleaseItemSkeleton />}
					</For>
				</div>
			</Match>
			<Match when={props.displayType === "wall"}>
				<div class={WALL_CONTAINER_CLASS}>
					<For each={Array.from({ length: props.limit })}>
						{() => <ReleaseWallItemSkeleton />}
					</For>
				</div>
			</Match>
		</Switch>
	)
}

export type ReleaseExploreListStore = {
	releases: Release[]
	locale: string
	isLoading: boolean
	limit: number
	page: number
	displayType: DisplayType
	totalPages: number
	setPage: (page: number) => void
}

export type ReleaseExploreListProps = {
	store: ReleaseExploreListStore
}

export function ReleaseExploreList(props: ReleaseExploreListProps) {
	return (
		<>
			<Show when={!props.store.isLoading && props.store.releases.length === 0}>
				<EmptyExplorePlaceholder
					title="No releases found"
					action={{ to: "/release/new" }}
				/>
			</Show>

			<Switch>
				<Match when={props.store.displayType === "list"}>
					<div class="flex flex-col">
						<For each={props.store.releases}>
							{(release) => (
								<ReleaseItem
									release={release}
									locale={props.store.locale}
								/>
							)}
						</For>
					</div>
				</Match>
				<Match when={props.store.displayType === "wall"}>
					<div class={WALL_CONTAINER_CLASS}>
						<For each={props.store.releases}>
							{(release) => (
								<ReleaseWallItem
									release={release}
									locale={props.store.locale}
								/>
							)}
						</For>
					</div>
				</Match>
			</Switch>

			<Show when={props.store.isLoading}>
				<ReleaseExploreListSkeleton
					limit={props.store.limit}
					displayType={props.store.displayType}
				/>
			</Show>

			<Show when={props.store.totalPages > 1}>
				<div class="flex justify-center py-6">
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
