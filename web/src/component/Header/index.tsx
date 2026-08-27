import { Dialog as K_Dialog } from "@kobalte/core"
import { Trans, useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { Link, useNavigate } from "@tanstack/solid-router"
import { BellIcon } from "@thc/icons/heroicons/24/outline"
import { StrExt } from "@thc/toolkit/data"
import { createSignal, Match, Show, Switch } from "solid-js"
import { HamburgerMenuIcon, MagnifyingGlassIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { Select } from "~/component/atomic/form/select"
import { unreadCountOptions } from "~/hey-api/@tanstack/solid-query.gen"
import type { SessionProfile } from "~/state/user"
import { useCurrentUser } from "~/state/user"
import { createClickOutside } from "~/utils/solid/createClickOutside"

import { Divider } from "../atomic/Divider"
import { Avatar } from "../atomic/avatar"
import { Dialog } from "../dialog"
import { LeftSidebar } from "./LeftSidebar"
import { RightSidebar } from "./RightSidebar"

const HEADER_BTN_CLASS = "m-auto size-fit cursor-pointer p-1"

type EntityFilter =
	| "all"
	| "artist"
	| "event"
	| "label"
	| "release"
	| "song"
	| "tag"

const ENTITY_FILTER_OPTIONS: EntityFilter[] = [
	"all",
	"artist",
	"event",
	"label",
	"release",
	"song",
	"tag",
] as const

function HeaderSkeleton() {
	return (
		<>
			<div
				class="grid size-8 place-items-center"
				aria-hidden="true"
			>
				<div class="size-4 animate-pulse rounded-full bg-slate-200"></div>
			</div>
			<div
				class="size-8 animate-pulse rounded-full bg-slate-200"
				aria-hidden="true"
			></div>
		</>
	)
}

export function Header() {
	const { t } = useLingui()
	const currentUser = useCurrentUser()
	const unread = useQuery(() => ({
		...unreadCountOptions(),
		enabled: currentUser.session.status === "authenticated",
	}))

	return (
		<header class="border-b border-slate-300 bg-primary px-4 py-2">
			<div
				class="min-h-8 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-y-2 items-center
					xl:flex xl:justify-between"
			>
				{/* Left */}
				<div class="flex items-center gap-3">
					<Dialog.Root>
						<K_Dialog.Trigger
							variant="Tertiary"
							class={HEADER_BTN_CLASS}
							aria-label={t`Open navigation menu`}
							as={Button}
						>
							<HamburgerMenuIcon class={"m-auto size-5 text-slate-400"} />
						</K_Dialog.Trigger>
						<Dialog.Portal>
							<Dialog.Overlay />
							<K_Dialog.Content class="fixed inset-0 z-50 w-fit">
								<LeftSidebar />
							</K_Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>

					<Divider
						vertical
						class="h-6"
					/>
				</div>
				<SearchBar />

				{/* Right	*/}

				<div class="col-start-3 row-start-1 flex h-full shrink place-content-center items-center gap-3">
					<Divider
						vertical
						class="h-6"
					/>
					<Switch>
						<Match when={currentUser.session.status === "loading"}>
							<HeaderSkeleton />
						</Match>
						<Match when={currentUser.profile}>
							{(user) => (
								<AuthenticatedContent
									user={user()}
									unreadCount={unread.data?.data.count ?? 0}
								/>
							)}
						</Match>
						<Match when={currentUser.session.status === "anonymous"}>
							<UnauthenticatedButtons />
						</Match>
					</Switch>
				</div>
			</div>
		</header>
	)
}

type AuthenticatedContentProps = {
	user: SessionProfile
	unreadCount: number
}

function AuthenticatedContent(props: AuthenticatedContentProps) {
	const { t } = useLingui()
	const [show, setShow, setRef] = createClickOutside()
	const close = () => setShow(false)

	return (
		<>
			<div class="grid h-8 w-8 place-items-center">
				<BellButton unreadCount={props.unreadCount} />
			</div>
			<Dialog.Root
				open={show()}
				onOpenChange={setShow}
			>
				<K_Dialog.Trigger
					as={Button}
					variant="Tertiary"
					class="size-fit cursor-pointer rounded-full p-0"
					aria-label={t`Open user menu`}
				>
					<Avatar user={props.user} />
				</K_Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Overlay onClick={close} />
					<K_Dialog.Content class="fixed inset-0 z-50">
						<RightSidebar
							ref={setRef}
							onClose={() => setShow(false)}
						/>
					</K_Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	)
}

function SearchBar() {
	const { t } = useLingui()
	const navigate = useNavigate()
	let inputRef: HTMLInputElement | undefined

	const [entity, setEntity] = createSignal<EntityFilter>("all")
	const [showFilter, setShowFilter] = createSignal(false)

	const submit = (e: Event) => {
		e.preventDefault()
		const value = inputRef?.value.trim() ?? ""
		if (value.length === 0) return
		const selected = entity()
		if (selected === "all") {
			void navigate({ to: "/search", search: { q: value } })
		} else {
			void navigate({
				to: "/search",
				search: { q: value, entity: selected, tab: selected },
			})
		}
	}

	return (
		<form
			class="col-span-3 col-start-1 row-start-2 w-full
				sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:max-w-96 sm:justify-self-center
				xl:ml-36"
			onSubmit={submit}
		>
			<div
				class="relative grid items-center"
				onFocusIn={() => setShowFilter(true)}
				onFocusOut={(e) => {
					const next = e.relatedTarget
					if (next instanceof Node && e.currentTarget.contains(next)) return
					setShowFilter(false)
				}}
			>
				<input
					ref={(el) => {
						inputRef = el
					}}
					type="search"
					aria-label={t`Search artists, releases, songs`}
					placeholder={t`Search artists, releases, songs…`}
					class="mr-auto h-7 w-full rounded-xs bg-slate-100 pl-7 outline-transparent duration-200 hover:outline hover:outline-reimu-600 focus:bg-white focus:outline-[1.5px] focus:outline-reimu-600"
				/>
				<MagnifyingGlassIcon class="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-slate-500" />

				<Show when={showFilter()}>
					<div class="absolute left-0 top-full z-50 mt-2 w-full rounded-sm border border-slate-200 bg-white p-2 shadow-md">
						<div class="flex items-center justify-between gap-3">
							<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
								<Trans>Filter</Trans>
							</div>
							<Select.Root
								options={ENTITY_FILTER_OPTIONS}
								value={entity()}
								onChange={(value) => {
									if (value === null) return
									setEntity(value)
								}}
								itemComponent={(props) => (
									<Select.Item item={props.item}>
										{StrExt.capitalize(props.item.rawValue)}
									</Select.Item>
								)}
							>
								<Select.Trigger class="h-7 w-40 text-sm">
									<Select.Value<EntityFilter>>
										{(state) => StrExt.capitalize(state.selectedOption())}
									</Select.Value>
									<Select.Icon />
								</Select.Trigger>
								<Select.Portal>
									<Select.Content>
										<Select.Listbox />
									</Select.Content>
								</Select.Portal>
							</Select.Root>
						</div>
					</div>
				</Show>
			</div>
		</form>
	)
}

function BellButton(props: { unreadCount: number }) {
	const { t } = useLingui()

	return (
		<Link
			to="/notifications"
			search={{ state: "inbox" }}
			aria-label={t`Notifications`}
			class="relative grid place-items-center p-1"
		>
			<BellIcon class="m-auto size-4" />
			<Show when={props.unreadCount > 0}>
				<span class="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-reimu-600 px-1 text-xs leading-none text-white">
					{props.unreadCount > 99 ? "99+" : props.unreadCount}
				</span>
			</Show>
		</Link>
	)
}

function UnauthenticatedButtons() {
	const { t } = useLingui()
	// @tw
	const BTN_CLASS = "py-1 px-3 text-sm"

	return (
		<div class="grid grid-cols-2 gap-3">
			<Button
				variant="Tertiary"
				class={BTN_CLASS.concat(" ", "text-slate-900")}
				type="button"
			>
				<Link
					to="/auth"
					search={{
						type: "sign_in",
					}}
				>
					{t`Sign In`}
				</Link>
			</Button>
			<Button
				variant="Primary"
				class={BTN_CLASS}
				type="button"
			>
				<Link
					to="/auth"
					search={{
						type: "sign_up",
					}}
				>
					{t`Sign Up`}
				</Link>
			</Button>
		</div>
	)
}
