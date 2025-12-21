import type { Event, Release, Tag } from "@thc/api"
import { For, Show } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { PageLayout } from "~/layout/PageLayout"
import {
	HOME_FEATURED_RELEASES,
	HOME_METRICS,
	type HomeNavItem,
	HOME_NAV_ITEMS,
	HOME_TRENDING_TAGS,
	HOME_UPCOMING_EVENTS,
} from "~/view/Homepage/mock"

const ACCENT = {
	Reimu: {
		badge: "bg-reimu-100 text-reimu-800 ring-reimu-200",
		ring: "ring-reimu-200 hover:ring-reimu-300",
	},
	Marisa: {
		badge: "bg-marisa-100 text-marisa-800 ring-marisa-200",
		ring: "ring-marisa-200 hover:ring-marisa-300",
	},
	Blue: {
		badge: "bg-blue-100 text-blue-800 ring-blue-200",
		ring: "ring-blue-200 hover:ring-blue-300",
	},
	Green: {
		badge: "bg-green-100 text-green-800 ring-green-200",
		ring: "ring-green-200 hover:ring-green-300",
	},
	Slate: {
		badge: "bg-slate-100 text-slate-800 ring-slate-200",
		ring: "ring-slate-200 hover:ring-slate-300",
	},
} satisfies Record<HomeNavItem["accent"], { badge: string; ring: string }>

export function HomePage() {
	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-10">
				<HomeHero />

				<section class="flex flex-col gap-4">
					<div class="flex items-end justify-between gap-6">
						<div class="flex flex-col gap-1">
							<h2 class="text-xl font-light tracking-tight text-slate-900">
								Explore
							</h2>
							<p class="text-sm text-slate-600">
								A fast path into the database, built around real entity pages.
							</p>
						</div>
						<Link
							to="/about"
							class="text-sm text-slate-600 no-underline hover:text-slate-900 hover:no-underline"
						>
							About →
						</Link>
					</div>

					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<For each={HOME_NAV_ITEMS}>
							{(item) => <ExploreCard item={item} />}
						</For>
					</div>
				</section>

				<section class="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
					<div class="flex flex-col gap-4">
						<div class="flex items-end justify-between gap-6">
							<div class="flex flex-col gap-1">
								<h2 class="text-xl font-light tracking-tight text-slate-900">
									Latest Releases
								</h2>
								<p class="text-sm text-slate-600">
									A small mock slice — cover, artists, types and dates.
								</p>
							</div>
							<Link
								to="/release/explore"
								class="text-sm text-slate-600 no-underline hover:text-slate-900 hover:no-underline"
							>
								View all →
							</Link>
						</div>

						<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							<For each={HOME_FEATURED_RELEASES}>
								{(release) => <ReleaseCard release={release} />}
							</For>
						</div>
					</div>

					<div class="flex flex-col gap-4">
						<TrendingTagsCard tags={HOME_TRENDING_TAGS} />
						<UpcomingEventsCard events={HOME_UPCOMING_EVENTS} />
					</div>
				</section>

				<Card class="relative overflow-hidden border border-slate-300 p-6 shadow-xs">
					<div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-100 via-primary to-white opacity-80" />
					<div class="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
						<div class="flex flex-col gap-2">
							<h2 class="text-xl font-light tracking-tight text-slate-900">
								Help us keep the index accurate.
							</h2>
							<p class="max-w-2xl text-sm text-slate-600">
								THCDB is built around credits and relationships. Sign up to
								start editing, tagging and linking entries.
							</p>
						</div>
						<div class="flex flex-wrap items-center gap-3">
							<Link
								to="/auth"
								search={{ type: "sign_up" }}
								class="no-underline hover:no-underline"
							>
								<Button
									variant="Primary"
									color="Reimu"
									class="px-5"
								>
									Create account
								</Button>
							</Link>
							<Link
								to="/auth"
								search={{ type: "sign_in" }}
								class="no-underline hover:no-underline"
							>
								<Button
									variant="Secondary"
									color="Slate"
									class="px-5"
								>
									Sign in
								</Button>
							</Link>
						</div>
					</div>
				</Card>
			</div>
		</PageLayout>
	)
}

function HomeHero() {
	return (
		<section class="relative overflow-hidden rounded-md border border-slate-300 bg-gradient-to-br from-reimu-100 via-primary to-marisa-100 shadow-xs">
			<div class="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:22px_22px] opacity-55" />
			<div class="relative grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr]">
				<div class="flex flex-col gap-6">
					<div class="flex items-center gap-3">
						<img
							src="/logo.svg"
							alt=""
							class="h-10 w-10"
						/>
						<div class="flex flex-col leading-none">
							<div class="text-xs font-medium tracking-[0.22em] text-slate-700">
								TOUHOU CLOUD DB
							</div>
							<div class="text-xs text-slate-500">
								Open doujin music database
							</div>
						</div>
					</div>

					<div class="flex flex-col gap-3">
						<h1 class="text-4xl font-light tracking-tighter text-slate-900 sm:text-5xl">
							Find releases, track credits, map relationships.
						</h1>
						<p class="max-w-2xl text-base leading-relaxed text-slate-700">
							A clean, entity-first workspace for artists, songs, tags and
							events. This page uses mock data, but follows the final layout
							direction.
						</p>
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<Link
							to="/release/explore"
							class="no-underline hover:no-underline"
						>
							<Button
								variant="Primary"
								color="Reimu"
								class="px-5"
							>
								Explore Releases
							</Button>
						</Link>
						<Link
							to="/song/explore"
							class="no-underline hover:no-underline"
						>
							<Button
								variant="Secondary"
								color="Slate"
								class="px-5"
							>
								Explore Songs
							</Button>
						</Link>
						<Link
							to="/tag/explore"
							class="text-sm text-slate-700 no-underline hover:text-slate-900 hover:no-underline"
						>
							Browse tags →
						</Link>
					</div>
				</div>

				<div class="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
					<For each={HOME_METRICS}>
						{(metric) => <MetricCard metric={metric} />}
					</For>
					<Card class="border border-slate-300 bg-white/70 p-4 shadow-xs backdrop-blur-sm">
						<div class="flex flex-col gap-2">
							<div class="text-xs font-medium tracking-[0.18em] text-slate-500">
								STATUS
							</div>
							<div class="flex items-center justify-between gap-4">
								<div class="text-sm text-slate-700">Mock-powered UI</div>
								<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 ring-inset">
									<span class="inline-block size-1.5 rounded-full bg-reimu-600" />
									Preview
								</div>
							</div>
							<div class="text-xs text-slate-500">
								Components follow project tokens: slate base, reimu/marisa
								accents, subtle borders and shadows.
							</div>
						</div>
					</Card>
				</div>
			</div>
		</section>
	)
}

type MetricCardProps = {
	metric: { label: string; value: string; hint: string }
}

function MetricCard(props: MetricCardProps) {
	return (
		<Card class="border border-slate-300 bg-white/70 p-4 shadow-xs backdrop-blur-sm">
			<div class="flex items-baseline justify-between gap-4">
				<div class="text-sm font-medium text-slate-900">
					{props.metric.label}
				</div>
				<div class="font-mono text-lg text-slate-900">{props.metric.value}</div>
			</div>
			<div class="mt-1 text-xs text-slate-500">{props.metric.hint}</div>
		</Card>
	)
}

type ExploreCardProps = {
	item: HomeNavItem
}

function ExploreCard(props: ExploreCardProps) {
	return (
		<Link
			to={props.item.to}
			class="group block no-underline hover:no-underline"
		>
			<Card
				class={`flex h-full flex-col justify-between gap-4 border border-slate-300 p-5 shadow-xs ring-1 transition-all duration-150 ring-inset motion-reduce:transition-none ${ACCENT[props.item.accent].ring} hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0`}
			>
				<div class="flex items-start justify-between gap-4">
					<div class="flex flex-col gap-2">
						<div
							class={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ring-inset ${ACCENT[props.item.accent].badge}`}
						>
							<span class="inline-block size-1.5 rounded-full bg-current opacity-70" />
							{props.item.meta}
						</div>
						<div class="text-base font-medium text-slate-900">
							{props.item.title}
						</div>
					</div>
					<div class="font-mono text-xs text-slate-400 transition-colors duration-150 group-hover:text-slate-700 motion-reduce:transition-none">
						→
					</div>
				</div>

				<div class="text-sm leading-relaxed text-slate-600">
					{props.item.description}
				</div>
			</Card>
		</Link>
	)
}

type ReleaseCardProps = {
	release: Release
}

function ReleaseCard(props: ReleaseCardProps) {
	let artistsLabel = () => formatArtists(props.release.artists)
	let releaseDate = () => displayReleaseDate(props.release.release_date)
	let coverUrl = () => props.release.cover_art_url ?? undefined

	return (
		<Card class="border border-slate-300 p-0 shadow-xs transition-shadow duration-150 hover:shadow-md motion-reduce:transition-none">
			<div class="flex h-full flex-col overflow-hidden rounded-sm">
				<Show
					when={coverUrl()}
					fallback={
						<div class="grid aspect-[4/3] place-items-center bg-slate-100 text-xs text-slate-500 ring-1 ring-slate-200 ring-inset">
							No cover
						</div>
					}
				>
					{(src) => (
						<img
							src={src()}
							alt=""
							loading="lazy"
							class="aspect-[4/3] w-full bg-slate-100 object-cover"
						/>
					)}
				</Show>

				<div class="flex flex-1 flex-col gap-2 p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="truncate text-sm font-medium text-slate-900">
								{props.release.title}
							</div>
							<div class="mt-1 truncate text-xs text-slate-500">
								{artistsLabel()}
							</div>
						</div>
						<div class="shrink-0 text-xs text-slate-500">
							<Show when={releaseDate()}>{(d) => <span>{d()}</span>}</Show>
						</div>
					</div>

					<div class="mt-auto flex items-center justify-between gap-3">
						<div class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 ring-inset">
							{props.release.release_type}
						</div>
						<Link
							to="/release/$id"
							params={{ id: props.release.id.toString() }}
							class="text-xs text-slate-600 no-underline hover:text-slate-900 hover:no-underline"
						>
							Open →
						</Link>
					</div>
				</div>
			</div>
		</Card>
	)
}

type TrendingTagsCardProps = {
	tags: Tag[]
}

function TrendingTagsCard(props: TrendingTagsCardProps) {
	return (
		<Card class="flex flex-col gap-4 border border-slate-300 p-5 shadow-xs">
			<div class="flex items-end justify-between gap-6">
				<div class="flex flex-col gap-1">
					<h3 class="text-lg font-light tracking-tight text-slate-900">
						Trending Tags
					</h3>
					<p class="text-sm text-slate-600">A quick hop into tag pages.</p>
				</div>
				<Link
					to="/tag/explore"
					class="text-sm text-slate-600 no-underline hover:text-slate-900 hover:no-underline"
				>
					Explore →
				</Link>
			</div>

			<div class="flex flex-wrap gap-2">
				<For each={props.tags.slice(0, 14)}>
					{(tag) => (
						<Link
							to="/tag/$id"
							params={{ id: tag.id.toString() }}
							class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 no-underline ring-1 ring-slate-200 transition-colors duration-150 ring-inset hover:bg-slate-200 hover:no-underline motion-reduce:transition-none"
						>
							#{tag.name}
						</Link>
					)}
				</For>
			</div>
		</Card>
	)
}

type UpcomingEventsCardProps = {
	events: Event[]
}

function UpcomingEventsCard(props: UpcomingEventsCardProps) {
	return (
		<Card class="flex flex-col gap-4 border border-slate-300 p-5 shadow-xs">
			<div class="flex items-end justify-between gap-6">
				<div class="flex flex-col gap-1">
					<h3 class="text-lg font-light tracking-tight text-slate-900">
						Upcoming Events
					</h3>
					<p class="text-sm text-slate-600">
						Conventions and live shows — mocked for now.
					</p>
				</div>
				<Link
					to="/event/explore"
					class="text-sm text-slate-600 no-underline hover:text-slate-900 hover:no-underline"
				>
					Explore →
				</Link>
			</div>

			<ul class="flex flex-col divide-y divide-slate-200 overflow-hidden rounded-sm border border-slate-200 bg-white/60">
				<For each={props.events}>{(event) => <EventRow event={event} />}</For>
			</ul>
		</Card>
	)
}

type EventRowProps = {
	event: Event
}

function EventRow(props: EventRowProps) {
	let dateLabel = () => displayEventDate(props.event)
	let locationLabel = () => formatEventLocation(props.event)

	return (
		<li class="flex items-start justify-between gap-4 p-4">
			<div class="min-w-0">
				<div class="truncate text-sm font-medium text-slate-900">
					{props.event.name}
				</div>
				<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
					<Show when={dateLabel()}>
						{(d) => (
							<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 ring-1 ring-slate-200 ring-inset">
								{d()}
							</span>
						)}
					</Show>
					<Show when={locationLabel()}>{(l) => <span>{l()}</span>}</Show>
				</div>
			</div>
			<Link
				to="/event/$id"
				params={{ id: props.event.id.toString() }}
				class="shrink-0 text-xs text-slate-600 no-underline hover:text-slate-900 hover:no-underline"
			>
				Open →
			</Link>
		</li>
	)
}

function formatArtists(artists: { name: string }[] | undefined) {
	if (!artists || artists.length === 0) return "Unknown artist"
	return artists
		.slice(0, 3)
		.map((a) => a.name)
		.join(" · ")
}

function displayReleaseDate(date: Release["release_date"] | null | undefined) {
	if (!date) return
	if (date.precision === "Year") return date.value.slice(0, 4)
	if (date.precision === "Month") return date.value.slice(0, 7)
	return date.value
}

function displayEventDate(event: Event) {
	let start = event.start_date?.value
	if (!start) return

	let end = event.end_date?.value
	if (!end || start === end) return start
	return `${start}–${end}`
}

function formatEventLocation(event: Event) {
	let location = event.location
	if (!location) return
	let parts = [location.city, location.province, location.country].filter(
		Boolean,
	)
	return parts.join(", ")
}
