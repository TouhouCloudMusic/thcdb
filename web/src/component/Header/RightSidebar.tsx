import { useLingui } from "@lingui/solid/macro"
import type { Ref } from "solid-js"
import { Show } from "solid-js"
import {
	BookmarkIcon,
	Cross1Icon,
	CubeIcon,
	ExitIcon,
	GearIcon,
	Pencil2Icon,
	PersonIcon,
} from "solid-radix-icons"

import { ListItem, Sidebar } from "~/component/Sidebar"
import type { SessionProfile } from "~/state/user"
import { useCurrentUser } from "~/state/user"

import { Divider } from "../atomic/Divider"
import { Avatar } from "../atomic/avatar"
import { Button } from "../atomic/button"

export function RightSidebar(props: {
	onClose: VoidFunction
	ref?: Ref<HTMLDivElement>
}) {
	const currentUser = useCurrentUser()

	return (
		<Show when={currentUser.profile}>
			{(user) => (
				<RightSidebarView
					ref={props.ref}
					user={user()}
					onClose={props.onClose}
					onSignOut={() => {
						void currentUser.signOut()
					}}
				/>
			)}
		</Show>
	)
}

export function RightSidebarView(props: {
	user: SessionProfile
	onClose: VoidFunction
	onSignOut: VoidFunction
	ref?: Ref<HTMLDivElement>
}) {
	const { t } = useLingui()

	return (
		<>
			<Sidebar
				ref={props.ref}
				class="relative right-0 flex h-full flex-col gap-2 p-3"
			>
				<div class="flex pl-1">
					<Avatar user={props.user} />
					<div class="mx-2 text-sm font-medium">{props.user.name}</div>
					<Button
						variant="Tertiary"
						class="mr-1 ml-auto size-fit self-center p-1"
						onClick={props.onClose}
					>
						<Cross1Icon />
					</Button>
				</div>
				<Divider
					class="my-0.5 px-2"
					horizontal
				/>
				<div class="flex flex-col">
					<ListItem to="/profile">
						<PersonIcon />
						<span>{t`Profile`}</span>
					</ListItem>
					<ListItem
						to="/profile"
						search={{ tab: "collections" }}
					>
						<BookmarkIcon />
						<span>{t`Collections`}</span>
					</ListItem>
					<ListItem>
						<CubeIcon />
						<span>{t`Recommendations`}</span>
					</ListItem>
				</div>
				<Divider
					class="my-0.5 px-2"
					horizontal
				/>
				<div class="flex flex-col">
					<ListItem>
						<Pencil2Icon />
						<span>{t`Support`}</span>
					</ListItem>
					<ListItem>
						<GearIcon />
						<span>{t`Settings`}</span>
					</ListItem>
					<ListItem onClick={props.onSignOut}>
						<ExitIcon />
						<span>{t`Sign Out`}</span>
					</ListItem>
				</div>
			</Sidebar>
		</>
	)
}
