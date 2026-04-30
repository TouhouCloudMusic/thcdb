import { Dialog as K_Dialog } from "@kobalte/core"
import { useLingui } from "@lingui/solid/macro"
import { Link, useNavigate } from "@tanstack/solid-router"
import type { UserProfile } from "@thc/api"
import {
	BellAlertIcon,
	BellIcon,
	BellSlashIcon,
} from "@thc/icons/heroicons/24/outline"
import { StrExt } from "@thc/toolkit/data"
import { createMemo, createSignal, Match, Show, Switch } from "solid-js"
import { HamburgerMenuIcon, MagnifyingGlassIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { Select } from "~/component/atomic/form/select"
import { NotificationState, useCurrentUser } from "~/state/user"
import { createClickOutside } from "~/utils/solid/createClickOutside"

import { Divider } from "../atomic/Divider"
import { Avatar } from "../atomic/avatar"
import { Dialog } from "../dialog"
import { LeftSidebar } from "./LeftSidebar"
import { RightSidebar } from "./RightSidebar"

const HEADER_BTN_CLASS = "size-fit p-1 m-auto"

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

export function Header() {
	return (
		<header class="box-content content-center items-center border-b-1 border-slate-300 bg-primary px-4 py-2">
			<div class="my-auto flex h-8 items-center justify-between">
				{/* Left */}
				<div class="flex items-center gap-3">
					<Dialog.Root>
						<K_Dialog.Trigger
							variant="Tertiary"
							class={HEADER_BTN_CLASS}
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

				<div class="flex h-full shrink place-content-center items-center gap-3">
					<Divider
						vertical
						class="h-6"
					/>
					<Show
						when={useCurrentUser().user}
						fallback={<UnauthenticatedButtons />}
					>
						{(user) => <AuthenticatedContent user={user()} />}
					</Show>
				</div>
			</div>
		</header>
	)
}

function AuthenticatedContent(props: { user: UserProfile }) {
	const [show, setShow, setRef] = createClickOutside()
	const close = () => setShow(false)
	return (
		<>
			<div class="grid h-8 w-8 place-items-center">
				<NotificationButton />
			</div>
			<button onClick={() => setShow(!show())}>
				<Avatar user={props.user} />
			</button>
			<Dialog.Root
				open={show()}
				onOpenChange={close}
			>
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
			class="ml-36 w-fit"
			role="search"
			onSubmit={submit}
		>
			<div
				class="relative grid w-96 items-center"
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
					placeholder={t`Search artists, releases, songs…`}
					class="mr-auto h-7 w-full rounded-xs bg-slate-100 pl-7 outline-transparent duration-200 hover:outline hover:outline-reimu-600 focus:bg-white focus:outline-[1.5px] focus:outline-reimu-600"
				/>
				<MagnifyingGlassIcon class="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-slate-500" />

				<Show when={showFilter()}>
					<div class="absolute left-0 top-full z-50 mt-2 w-full rounded-sm border border-slate-200 bg-white p-2 shadow-md">
						<div class="flex items-center justify-between gap-3">
							<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
								FILTER
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

function NotificationButton() {
	const notification_state = createMemo(
		() => useCurrentUser().notification_state,
	)
	return (
		<Button
			variant="Tertiary"
			class={HEADER_BTN_CLASS}
		>
			<Switch>
				<Match when={notification_state() === NotificationState.None}>
					<BellIcon class={"m-auto size-4"} />
				</Match>
				<Match when={notification_state() === NotificationState.Unread}>
					<BellAlertIcon class={"m-auto size-4"} />
				</Match>
				<Match when={notification_state() === NotificationState.Muted}>
					<BellSlashIcon class={"m-auto size-4"} />
				</Match>
			</Switch>
		</Button>
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
