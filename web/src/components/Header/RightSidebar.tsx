import { Link } from "@tanstack/solid-router"
import { createResource, type Ref } from "solid-js"
import {
	BookmarkIcon,
	Cross1Icon,
	CubeIcon,
	ExitIcon,
	GearIcon,
	HeartIcon,
	Pencil2Icon,
	PersonIcon,
	ReaderIcon,
} from "solid-radix-icons"

import { ListItem, Sidebar } from "~/components/Sidebar"
import { useUserCtx } from "~/state/user"

import { Avatar } from "../avatar"
import { Button } from "../button"
import { Divider } from "../divider"

export type Props = {
	onClose: VoidFunction
	ref?: Ref<HTMLDivElement>
}

export function RightSidebar(props: Props) {
	const userCtx = useUserCtx()

	return (
		<>
			<Sidebar
				ref={props.ref}
				class="relative right-0 flex h-full flex-col gap-2 p-3"
			>
				<div class="flex pl-1">
					<Avatar user={userCtx.user} />
					<div class="mx-2 text-sm font-medium">{userCtx.user?.name}</div>
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
					horizonal
				/>
				<div class="flex flex-col">
					<ListItem>
						<PersonIcon />
						<span>
							<Link to="/profile">Profile</Link>
						</span>
					</ListItem>
					<ListItem>
						<BookmarkIcon />
						<span>Collections</span>
					</ListItem>
					<ListItem>
						<HeartIcon />
						<span>Favorites</span>
					</ListItem>
					<ListItem>
						<ReaderIcon />
						<span>Lists</span>
					</ListItem>
					<ListItem>
						<CubeIcon />
						<span>Recommandations</span>
					</ListItem>
				</div>
				<Divider
					class="my-0.5 px-2"
					horizonal
				/>
				<div class="flex flex-col">
					<ListItem>
						<Pencil2Icon />
						<span>Support</span>
					</ListItem>
					<ListItem>
						<GearIcon />
						<span>Settings</span>
					</ListItem>
					<ListItem onClick={() => userCtx.sign_out()}>
						<ExitIcon />
						<span>Sign Out</span>
					</ListItem>
				</div>
			</Sidebar>
		</>
	)
}
