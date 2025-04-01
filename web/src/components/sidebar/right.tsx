import { Link } from "@tanstack/solid-router"
import { JSX, Ref } from "solid-js"
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
import { useUserCtx } from "~/state/user"

import { ListItem, Sidebar } from "."
import { Avatar } from "../avatar"
import { Button } from "../button"
import { Divider } from "../divider"

export type Props = {
  onClose: VoidFunction
  ref?: Ref<HTMLDivElement>
}

export function RightSidebar(props: Props) {
  let user_ctx = useUserCtx()
  return (
    <>
      <Sidebar
        ref={props.ref}
        class="h-full right-0 relative p-3 flex flex-col gap-2"
      >
        <div class="flex pl-1">
          <Avatar user={user_ctx.user} />
          <div class="font-medium text-sm mx-2">{user_ctx.user?.name}</div>
          <Button
            variant="Tertiary"
            class="ml-auto self-center size-fit p-1 mr-1"
            onClick={props.onClose}
          >
            <Cross1Icon />
          </Button>
        </div>
        <Divider
          class="px-2 my-0.5"
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
          class="px-2 my-0.5"
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
          <ListItem onClick={() => user_ctx.sign_out()}>
            <ExitIcon />
            <span>Sign Out</span>
          </ListItem>
        </div>
      </Sidebar>
    </>
  )
}
