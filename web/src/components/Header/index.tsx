import { Dialog as K_Dialog } from "@kobalte/core"
import { useLingui } from "@lingui-solid/solid/macro"
import { Link } from "@tanstack/solid-router"
import { createMemo, Match, Show, Switch } from "solid-js"
import { HamburgerMenuIcon, MagnifyingGlassIcon } from "solid-radix-icons"

import type { UserProfile } from "~/api/user"
import { Button } from "~/components/button"
import { NotificationState, useUserCtx } from "~/state/user"
import { createClickOutside } from "~/utils/solid/createClickOutside.ts"

import { Avatar } from "../avatar/index.tsx"
import { Dialog } from "../dialog/index.ts"
import { Divider } from "../divider"
import {
	BellAlertIcon,
	BellIcon,
	BellSlashIcon,
} from "../icons/heroicons/24/outline.tsx"
import { LeftSidebar } from "./LeftSidebar"
import { RightSidebar } from "./RightSidebar"

const HEADER_BTN_CLASS = "size-fit p-1 m-auto"

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
						when={useUserCtx().user}
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
	let [show, setShow, setRef] = createClickOutside()
	let close = () => setShow(false)
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
	return (
		<div class="ml-36 grid w-fit items-center">
			<input
				class={`mr-auto h-7 w-96 rounded-xs bg-slate-100 pl-7 outline-transparent duration-200 hover:outline hover:outline-reimu-600 focus:bg-white focus:outline-[1.5px] focus:outline-reimu-600`}
			/>
			<MagnifyingGlassIcon class={"absolute col-start-1 ml-2 size-4"} />
		</div>
	)
}

function NotificationButton() {
	let notification_state = createMemo(() => useUserCtx().notification_state)
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
	// @tw
	const BTN_CLASS = "py-1 px-3 text-sm"
	const { t } = useLingui()

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
				{t`Sign Up`}
			</Button>
		</div>
	)
}
