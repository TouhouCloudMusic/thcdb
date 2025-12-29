/* @refresh reload */
import type { UserProfile, UserRoleEnum } from "@thc/api"
import type { ComponentProps } from "solid-js"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { twMerge } from "tailwind-merge"

import type { AppColor } from "~/component"
import { Badge } from "~/component/atomic/Badge"
import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { Avatar } from "~/component/atomic/avatar"
import { Button } from "~/component/atomic/button"
import { Markdown } from "~/component/markdown"
import { PageLayout } from "~/layout/PageLayout"
import { imgUrl } from "~/utils/adapter/static_file"

type Props = {
	data: UserProfile
	isCurrentUser: boolean
}

const enum UserType {
	Current,
	Following,
	Unfollowed,
}

type Metric = {
	label: string
	value: string
	hint: string
}

const MOCK_METRICS: Metric[] = [
	{
		label: "Edits",
		value: "248",
		hint: "Links · credit fixes · metadata",
	},
	{
		label: "New Entities",
		value: "31",
		hint: "Songs · releases · tags",
	},
	{
		label: "Votes",
		value: "112",
		hint: "Tag weights & relevance",
	},
	{
		label: "Reviews",
		value: "19",
		hint: "Corrections & discussions",
	},
]

type ActivityItem = {
	at: string
	accent: AppColor
	action: string
	entity: string
	detail: string
	link?:
		| { to: "/release/$id"; params: { id: string } }
		| { to: "/song/$id"; params: { id: string } }
		| { to: "/artist/$id"; params: { id: string } }
		| { to: "/tag/$id"; params: { id: string } }
		| { to: "/event/$id"; params: { id: string } }
		| { to: "/label/$id"; params: { id: string } }
}

const MOCK_ACTIVITY: ActivityItem[] = [
	{
		at: "2025-12-28T10:42:00.000Z",
		accent: "Reimu",
		action: "Added release",
		entity: "東方紅魔郷 Arrange Notes — Winter Press",
		detail: "linked artists · set event · added catalog no.",
		link: { to: "/release/$id", params: { id: "101" } },
	},
	{
		at: "2025-12-27T23:05:00.000Z",
		accent: "Blue",
		action: "Corrected credit",
		entity: "U.N. Owen was her? (arrange)",
		detail: "vocalist alias merged · role normalized",
		link: { to: "/song/$id", params: { id: "9" } },
	},
	{
		at: "2025-12-27T09:14:00.000Z",
		accent: "Slate",
		action: "Tagged song",
		entity: "少女さとり ～ 3rd eye",
		detail: "genre=Orchestral · theme=Horror · instrument=Piano",
		link: { to: "/song/$id", params: { id: "12" } },
	},
	{
		at: "2025-12-26T16:22:00.000Z",
		accent: "Green",
		action: "Created tag",
		entity: "Live recording",
		detail: "type=Recording · used by 6 releases",
		link: { to: "/tag/$id", params: { id: "21" } },
	},
	{
		at: "2025-12-25T07:40:00.000Z",
		accent: "Marisa",
		action: "Linked event",
		entity: "M3-53 (2025秋)",
		detail: "connected 4 new releases · fixed venue date",
		link: { to: "/event/$id", params: { id: "41" } },
	},
]

type PinItem = {
	accent: AppColor
	kind: string
	title: string
	subtitle: string
	coverUrl?: string
	to:
		| { to: "/release/$id"; params: { id: string } }
		| { to: "/song/$id"; params: { id: string } }
		| { to: "/artist/$id"; params: { id: string } }
		| { to: "/tag/$id"; params: { id: string } }
		| { to: "/event/$id"; params: { id: string } }
		| { to: "/label/$id"; params: { id: string } }
}

const MOCK_PINS: PinItem[] = [
	{
		accent: "Reimu",
		kind: "Release",
		title: "Touhou Cloud Essentials",
		subtitle: "Compilation · 24 tracks · mock cover",
		coverUrl: "/img/cover/release/1.png",
		to: { to: "/release/$id", params: { id: "1" } },
	},
	{
		accent: "Blue",
		kind: "Song",
		title: "U.N. Owen was her? (arrange)",
		subtitle: "Credit map · vocalist aliases · role normalization",
		to: { to: "/song/$id", params: { id: "9" } },
	},
	{
		accent: "Slate",
		kind: "Tag",
		title: "Trance",
		subtitle: "Genre tag · weighted votes · related sub-tags",
		to: { to: "/tag/$id", params: { id: "3" } },
	},
	{
		accent: "Green",
		kind: "Artist",
		title: "FELT",
		subtitle: "Circle profile · releases · vocalist credits",
		to: { to: "/artist/$id", params: { id: "12" } },
	},
	{
		accent: "Marisa",
		kind: "Event",
		title: "M3-53 (2025秋)",
		subtitle: "Event page · release links · location dates",
		to: { to: "/event/$id", params: { id: "41" } },
	},
	{
		accent: "Slate",
		kind: "Label",
		title: "Touhou Arrange Works",
		subtitle: "Imprint history · catalogue numbers · distribution",
		to: { to: "/label/$id", params: { id: "18" } },
	},
] satisfies [PinItem, ...PinItem[]]

export function Profile(props: Props) {
	const userType = createMemo(() => {
		if (props.isCurrentUser) {
			return UserType.Current
		}
		if (props.data.is_following) {
			return UserType.Following
		}
		return UserType.Unfollowed
	})

	return (
		<PageLayout class="min-h-full">
			<div class="flex min-h-full flex-col">
				<ProfileHero
					user={props.data}
					userType={userType()}
				/>

				<div class="border-b border-slate-300 bg-white/70 px-8 py-6">
					<MetricsStrip metrics={MOCK_METRICS} />
				</div>

				<div class="p-8">
					<PinsSection />

					<div class="mt-8 grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
						<BioCard user={props.data} />
						<ActivityCard />
					</div>
				</div>
			</div>
		</PageLayout>
	)
}

function ProfileHero(props: { user: UserProfile; userType: UserType }) {
	const bannerUrl = createMemo(() => imgUrl(props.user.banner_url))
	const lastLogin = createMemo(() => formatDateTime(props.user.last_login))
	const roles = createMemo(() => props.user.roles ?? [])

	return (
		<section class="relative border-b border-slate-300 bg-primary">
			<div class="relative h-64 overflow-hidden bg-slate-100">
				<Show when={bannerUrl()}>
					{(src) => (
						<img
							src={src()}
							alt="Profile banner"
							class="absolute inset-0 size-full object-cover object-center"
						/>
					)}
				</Show>
			</div>

			<div class="relative px-8 pt-6 pb-7">
				<div class="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-end">
					<div class="-mt-16 w-fit">
						<div class="rounded-md border border-slate-300 bg-white p-2 shadow-xs">
							<Avatar
								user={props.user}
								class="size-28"
							/>
						</div>
					</div>

					<div class="flex min-w-0 flex-col gap-4">
						<div class="flex flex-wrap items-start justify-between gap-4">
							<div class="min-w-0">
								<h1 class="truncate text-3xl font-light tracking-tight text-slate-900">
									{props.user.name}
								</h1>
								<div class="mt-2 flex flex-wrap items-center gap-2">
									<For each={roles()}>
										{(role) => <RoleBadge role={role.name} />}
									</For>
								</div>
							</div>

							<div class="shrink-0">
								<ProfileActionButton userType={props.userType} />
							</div>
						</div>

						<div class="grid gap-3 border-t border-slate-200 pt-4">
							<div class="flex flex-col gap-1">
								<div class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
									LAST LOGIN
								</div>
								<div class="font-mono text-sm text-slate-800">
									{lastLogin()}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

type ProfileActionButtonProps = {
	userType: UserType
} & ComponentProps<typeof Button>

function ProfileActionButton(props: ProfileActionButtonProps) {
	const BASE_CLASS = "w-32 px-4"

	const [hovering, setHovering] = createSignal(false)

	const onMouseEnter = () => setHovering(true)
	const onMouseLeave = () => setHovering(false)

	return (
		<Switch>
			<Match when={props.userType === UserType.Current}>
				<Link
					to="/profile/edit"
					class="no-underline hover:no-underline"
				>
					<Button
						variant="Secondary"
						color="Slate"
						class={twMerge(BASE_CLASS, "justify-center")}
					>
						Edit profile
					</Button>
				</Link>
			</Match>

			<Match when={props.userType === UserType.Unfollowed}>
				<Button
					variant="Primary"
					color="Reimu"
					class={twMerge(BASE_CLASS, "justify-center")}
				>
					Follow
				</Button>
			</Match>

			<Match when={props.userType === UserType.Following}>
				<Button
					variant="Secondary"
					color="Reimu"
					class={twMerge(BASE_CLASS, "justify-center")}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
				>
					<Switch>
						<Match when={hovering()}>Unfollow</Match>
						<Match when={!hovering()}>Following</Match>
					</Switch>
				</Button>
			</Match>
		</Switch>
	)
}

function BioCard(props: { user: UserProfile }) {
	const [mdParsing, setMdParsing] = createSignal(true)

	const bio = createMemo(() => props.user.bio)
	const shouldPulse = createMemo(() => Boolean(bio()) && mdParsing())
	const onRendered = () => setMdParsing(false)

	return (
		<Card class="overflow-hidden border border-slate-300 p-0 shadow-xs">
			<div class="bg-slate-50 flex items-center justify-between gap-3 border-b border-slate-300 px-5 py-4">
				<div class="text-xs font-medium tracking-[0.22em] text-slate-600">
					ABOUT
				</div>
			</div>

			<div
				class={twMerge("min-h-36 bg-primary", shouldPulse() && "animate-pulse")}
			>
				<Markdown
					content={bio()}
					fallback="这个人什么也没有写哦（"
					onRendered={onRendered}
				/>
			</div>
		</Card>
	)
}

function MetricsStrip(props: { metrics: Metric[] }) {
	return (
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<For each={props.metrics}>
				{(metric) => (
					<Card class="border border-slate-300 bg-white/70 p-4 shadow-xs backdrop-blur-sm">
						<div class="flex items-baseline justify-between gap-4">
							<div class="text-sm font-medium text-slate-900">
								{metric.label}
							</div>
							<div class="font-mono text-lg text-slate-900">{metric.value}</div>
						</div>
						<div class="mt-1 text-xs text-slate-500">{metric.hint}</div>
					</Card>
				)}
			</For>
		</div>
	)
}

function ActivityCard() {
	return (
		<Card class="border border-slate-300 p-5 shadow-xs">
			<div class="flex items-center justify-between gap-6">
				<div class="text-xs font-medium tracking-[0.22em] text-slate-600">
					ACTIVITY
				</div>
				<div class="font-mono text-xs text-slate-400">last 7d</div>
			</div>

			<div class="mt-5 grid gap-4">
				<For each={MOCK_ACTIVITY}>{(item) => <ActivityRow item={item} />}</For>
			</div>
		</Card>
	)
}

function ActivityRow(props: { item: ActivityItem }) {
	const timeLabel = createMemo(() => formatDateTime(props.item.at))
	const dotClass = createMemo(() => accentDotClass(props.item.accent))

	return (
		<div class="grid grid-cols-[8.75rem_1fr] gap-4">
			<div class="min-w-0">
				<div class="font-mono text-xs text-slate-600">{timeLabel()}</div>
				<div class="mt-1 text-[11px] font-medium tracking-[0.22em] text-slate-400">
					{props.item.action.toUpperCase()}
				</div>
			</div>

			<div class="relative border-l border-slate-200 pl-4">
				<div
					class={twMerge(
						"absolute top-1.5 -left-1 size-2 rounded-full border border-white",
						dotClass(),
					)}
				></div>
				<div class="flex flex-col gap-1">
					<ActivityEntity item={props.item} />
					<div class="text-sm leading-relaxed text-slate-600">
						{props.item.detail}
					</div>
				</div>
			</div>
		</div>
	)
}

function ActivityEntity(props: { item: ActivityItem }) {
	const link = createMemo(() => props.item.link)

	return (
		<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
			<Show
				when={link()}
				fallback={
					<span class="text-sm font-medium text-slate-900">
						{props.item.entity}
					</span>
				}
			>
				{(l) => (
					<Link
						to={l().to}
						params={l().params}
						class="text-sm font-medium text-slate-900 no-underline hover:text-slate-900 hover:no-underline"
					>
						{props.item.entity}
					</Link>
				)}
			</Show>
		</div>
	)
}

function PinsSection() {
	return (
		<section class="flex flex-col gap-4">
			<div class="flex flex-wrap items-end justify-between gap-6">
				<div class="flex flex-col gap-2">
					<div class="text-xs font-medium tracking-[0.22em] text-slate-600">
						PINS
					</div>
				</div>
				<div class="font-mono text-xs text-slate-400">
					{Math.min(MOCK_PINS.length, 6)} / 6
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<For each={MOCK_PINS.slice(0, 6)}>
					{(item) => <PinCard item={item} />}
				</For>
			</div>
		</section>
	)
}

function PinCard(props: { item: PinItem }) {
	const dotClass = createMemo(() => accentDotClass(props.item.accent))

	return (
		<Link
			to={props.item.to.to}
			params={props.item.to.params}
			class="group block no-underline hover:no-underline"
		>
			<Card class="flex h-full flex-col gap-4 border border-slate-300 bg-white/70 p-5 shadow-xs ring-1 ring-slate-200/60 transition-all duration-150 ring-inset hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<span
								class={twMerge("mt-0.5 inline-block size-2", dotClass())}
							></span>
							<div class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
								{props.item.kind.toUpperCase()}
							</div>
						</div>
						<div class="mt-2 truncate text-sm font-medium text-slate-900">
							{props.item.title}
						</div>
						<div class="mt-1 text-xs leading-relaxed text-slate-500">
							{props.item.subtitle}
						</div>
					</div>
					<div class="hidden font-mono text-xs text-slate-400 transition-colors duration-150 group-hover:text-slate-700 motion-reduce:transition-none sm:block">
						→
					</div>
				</div>

				<Show when={props.item.coverUrl}>
					{(src) => (
						<img
							src={src()}
							alt=""
							loading="lazy"
							class="mt-auto h-28 w-full rounded-sm border border-slate-200 bg-slate-100 object-cover"
						/>
					)}
				</Show>
			</Card>
		</Link>
	)
}

function RoleBadge(props: { role: UserRoleEnum }) {
	return (
		<Show when={props.role !== "User"}>
			<Badge
				color={roleColor(props.role)}
				class="px-3 py-1"
			>
				{props.role}
			</Badge>
		</Show>
	)
}

function roleColor(role: UserRoleEnum): AppColor {
	switch (role) {
		case "Admin": {
			return "Reimu"
		}
		case "Moderator": {
			return "Blue"
		}
		case "User": {
			return "Slate"
		}
	}
}

function accentDotClass(accent: AppColor) {
	switch (accent) {
		case "Reimu": {
			return "bg-reimu-600"
		}
		case "Blue": {
			return "bg-blue-700"
		}
		case "Green": {
			return "bg-green-700"
		}
		case "Marisa": {
			return "bg-marisa-700"
		}
		case "Gray": {
			return "bg-slate-700"
		}
		case "Slate": {
			return "bg-slate-700"
		}
	}
}

function formatDateTime(value: string) {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date)
}
