import type { UserProfile, UserRoleEnum } from "@thc/api"
import type { ComponentProps } from "solid-js"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { twMerge } from "tailwind-merge"

import type { AppColor } from "~/component"
import { Badge } from "~/component/atomic/Badge"
import { Link } from "~/component/atomic/Link"
import { Avatar } from "~/component/atomic/avatar"
import { Button } from "~/component/atomic/button"
import { Markdown } from "~/component/markdown"
import { PageLayout } from "~/layout/PageLayout"
import { imgUrl } from "~/utils/adapter/static_file"

type Props = {
	data: UserProfile
	isCurrentUser: boolean
	pins: readonly PinItem[]
	activity: readonly ActivityItem[]
	action?: ProfileActionProps
}

const enum UserType {
	Current,
	Following,
	Unfollowed,
}

type Metric = {
	label: string
	value: string
}

export type ActivityItem = {
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

export type PinItem = {
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

	const metrics = createMemo<Metric[]>(() => {
		return [
			{
				label: "Edits",
				value: String(props.data.stats.edit_count),
			},
			{
				label: "Votes",
				value: String(props.data.stats.vote_count),
			},
		]
	})

	const bannerUrl = createMemo(() => imgUrl(props.data.banner_url))
	const topRole = createMemo<UserRoleEnum | null>(() => {
		const roles = props.data.roles ?? []
		if (roles.length === 0) return null
		if (roles.some((r) => r.name === "Admin")) return "Admin"
		if (roles.some((r) => r.name === "Moderator")) return "Moderator"
		return "User"
	})

	return (
		<PageLayout class="min-h-full bg-primary font-sans pb-12">
			{/* Simple banner without styling tricks */}
			<div class="w-full h-32 sm:h-48 lg:h-64 bg-secondary border-b border-slate-200">
				<Show
					when={bannerUrl()}
					fallback={<div class="size-full bg-slate-50"></div>}
				>
					{(src) => (
						<img
							src={src()}
							alt="Profile banner"
							class="size-full object-cover object-center"
						/>
					)}
				</Show>
			</div>

			<div class="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12 flex flex-col lg:flex-row gap-12 lg:gap-16 pt-6 lg:pt-0">
				{/* Standard left sidebar */}
				<aside class="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col">
					<div class="lg:-mt-24 sm:-mt-16 mb-5">
						<Avatar
							user={props.data}
							class="size-32 sm:size-40 rounded-full border-4 border-white bg-white ring-1 ring-slate-200"
						/>
					</div>

					<h1 class="text-2xl text-primary leading-tight">{props.data.name}</h1>

					<div class="mt-2 flex flex-wrap items-center gap-2">
						<Show when={topRole()}>
							{(role) => <RoleBadge role={role()} />}
						</Show>
					</div>

					<Show when={props.isCurrentUser || props.action !== undefined}>
						<div class="mt-6 w-full max-w-[240px] lg:max-w-none">
							<ProfileActionButton
								userType={userType()}
								pendingAction={props.action?.pendingAction}
								errorMessage={props.action?.errorMessage}
								onFollow={props.action?.onFollow}
								onUnfollow={props.action?.onUnfollow}
							/>
						</div>
					</Show>

					<div class="mt-8 text-sm text-secondary">
						<AboutSection user={props.data} />
					</div>

					<div class="mt-8 pt-6 border-t border-slate-100">
						<MetricsSection metrics={metrics()} />
					</div>
				</aside>

				{/* Main content */}
				<main class="flex-1 min-w-0 flex flex-col gap-14 lg:mt-8">
					<Show when={props.pins.length > 0}>
						<PinsSection items={props.pins} />
					</Show>
					<ActivitySection items={props.activity} />
				</main>
			</div>
		</PageLayout>
	)
}

type ProfileActionButtonProps = {
	userType: UserType
	pendingAction?: "follow" | "unfollow"
	errorMessage?: string
	onFollow?: () => void
	onUnfollow?: () => void
} & ComponentProps<typeof Button>

type ProfileActionProps = Pick<
	ProfileActionButtonProps,
	"pendingAction" | "errorMessage" | "onFollow" | "onUnfollow"
>

const BUTTON_CLASS = "w-full justify-center text-sm px-4 py-2"

function ProfileActionButton(props: ProfileActionButtonProps) {
	const [hovering, setHovering] = createSignal(false)

	const onMouseEnter = () => setHovering(true)
	const onMouseLeave = () => setHovering(false)

	return (
		<div class="flex flex-col gap-2">
			<Switch>
				<Match when={props.userType === UserType.Current}>
					<Link
						to="/profile/edit"
						class="block no-underline hover:no-underline w-full outline-none"
					>
						<Button
							variant="SecondaryV2"
							color="Gray"
							class={BUTTON_CLASS}
						>
							Edit Profile
						</Button>
					</Link>
				</Match>

				<Match when={props.userType === UserType.Unfollowed}>
					<Button
						variant="SecondaryV2"
						color="Slate"
						class={BUTTON_CLASS}
						disabled={props.pendingAction !== undefined}
						onClick={props.onFollow}
					>
						{props.pendingAction === "follow" ? "Following..." : "Follow"}
					</Button>
				</Match>

				<Match when={props.userType === UserType.Following}>
					<Button
						variant="SecondaryV2"
						color="Slate"
						class={BUTTON_CLASS}
						disabled={props.pendingAction !== undefined}
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
						onClick={props.onUnfollow}
					>
						<Switch>
							<Match when={props.pendingAction === "unfollow"}>
								Unfollowing...
							</Match>
							<Match when={hovering()}>Unfollow</Match>
							<Match when={!hovering()}>Following</Match>
						</Switch>
					</Button>
				</Match>
			</Switch>

			<Show when={props.errorMessage}>
				<div class="text-sm text-red-600">{props.errorMessage}</div>
			</Show>
		</div>
	)
}

function AboutSection(props: { user: UserProfile }) {
	const [mdParsing, setMdParsing] = createSignal(true)
	const bio = createMemo(() => props.user.bio)
	const shouldPulse = createMemo(() => Boolean(bio()) && mdParsing())
	const onRendered = () => setMdParsing(false)

	return (
		<div class="flex flex-col gap-3">
			<h2 class="text-sm text-primary tracking-wide">About</h2>
			<div
				class={twMerge(
					"prose prose-slate prose-sm leading-relaxed max-w-none text-secondary",
					shouldPulse() && "animate-pulse opacity-50",
				)}
			>
				<Show
					when={bio()}
					fallback={
						<span class="text-slate-500 text-sm">No biography provided.</span>
					}
				>
					<Markdown
						content={bio()}
						onRendered={onRendered}
					/>
				</Show>
			</div>
		</div>
	)
}

function MetricsSection(props: { metrics: Metric[] }) {
	return (
		<div class="flex flex-col gap-3">
			<For each={props.metrics}>
				{(metric) => (
					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-600">{metric.label}</span>
						<span class="text-base text-primary tabular-nums">
							{metric.value}
						</span>
					</div>
				)}
			</For>
		</div>
	)
}

function PinsSection(props: { items: readonly PinItem[] }) {
	return (
		<section class="flex flex-col gap-5">
			<h2 class="text-lg text-primary pb-2 border-b border-slate-100">
				Highlights
			</h2>

			<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
				<For each={props.items}>{(item) => <PinCard item={item} />}</For>
			</div>
		</section>
	)
}

function PinCard(props: { item: PinItem }) {
	return (
		<Link
			to={props.item.to.to}
			params={props.item.to.params}
			class="group flex flex-col h-full bg-primary border border-slate-200 rounded-sm transition-colors hover:border-slate-300 no-underline outline-none overflow-hidden"
		>
			<Show when={props.item.coverUrl}>
				{(src) => (
					<div class="aspect-video w-full overflow-hidden bg-slate-50 border-b border-slate-100">
						<img
							src={src()}
							alt=""
							loading="lazy"
							class="size-full object-cover transition-opacity duration-300 group-hover:opacity-90"
						/>
					</div>
				)}
			</Show>

			<Show when={!props.item.coverUrl}>
				<div class="aspect-video w-full overflow-hidden bg-slate-50 border-b border-slate-100 flex items-center justify-center">
					<span class="text-slate-400 text-xs font-medium tracking-wide">
						{props.item.kind}
					</span>
				</div>
			</Show>

			<div class="flex flex-col flex-1 p-4">
				<div class="flex items-center mb-1">
					<span class="text-xs font-medium text-slate-500">
						{props.item.kind}
					</span>
				</div>
				<h3 class="text-base leading-tight text-primary group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
					{props.item.title}
				</h3>
				<p class="text-sm text-slate-500 line-clamp-2 mt-auto">
					{props.item.subtitle}
				</p>
			</div>
		</Link>
	)
}

function ActivitySection(props: { items: readonly ActivityItem[] }) {
	return (
		<section class="flex flex-col gap-5">
			<h2 class="text-lg text-primary pb-2 border-b border-slate-100">
				Recent Activity
			</h2>

			<Show
				when={props.items.length > 0}
				fallback={<SectionEmptyState message="No recent activity." />}
			>
				<div class="flex flex-col">
					<For each={props.items}>
						{(item, index) => (
							<ActivityRow
								item={item}
								isLast={index() === props.items.length - 1}
							/>
						)}
					</For>
				</div>
			</Show>
		</section>
	)
}

function SectionEmptyState(props: { message: string }) {
	return (
		<div class="border border-slate-200 rounded-sm bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
			{props.message}
		</div>
	)
}

function ActivityRow(props: { item: ActivityItem; isLast: boolean }) {
	return (
		<div
			class={twMerge(
				"flex flex-col sm:flex-row gap-2 sm:gap-4 py-4",
				props.isLast ? "" : "border-b border-slate-100",
			)}
		>
			<div class="w-32 shrink-0 text-sm text-slate-500 sm:pt-0.5">
				{formatDateTime(props.item.at)}
			</div>

			<div class="flex-1 min-w-0">
				<div class="text-[15px] text-primary leading-snug">
					<span class="text-slate-500 mr-2">{props.item.action}</span>
					<ActivityEntity item={props.item} />
				</div>

				<Show when={props.item.detail}>
					<div class="text-sm text-slate-500 mt-1 truncate">
						{props.item.detail}
					</div>
				</Show>
			</div>
		</div>
	)
}

function ActivityEntity(props: { item: ActivityItem }) {
	return (
		<Show
			when={props.item.link}
			fallback={<span class="text-primary">{props.item.entity}</span>}
		>
			{(l) => (
				<Link
					to={l().to}
					params={l().params}
					class="text-primary hover:underline transition-colors"
				>
					{props.item.entity}
				</Link>
			)}
		</Show>
	)
}

function RoleBadge(props: { role: UserRoleEnum }) {
	return (
		<Show when={props.role !== "User"}>
			<Badge
				color={roleColor(props.role)}
				class="rounded-sm border border-slate-200 bg-primary px-2 py-0.5 text-xs font-medium"
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
		default: {
			return "Slate"
		}
	}
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
})

function formatDateTime(value: string) {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return DATE_FORMATTER.format(date)
}
