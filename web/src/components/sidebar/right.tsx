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
import { use_user_ctx } from "~/state/user"

import { ListItem, Sidebar } from "."
import { Avatar } from "../avatar"
import { Direction, Divider } from "../divider"

export type Props = {
  onClose: VoidFunction
}

export function RightSidebar(props: Props) {
  let user_ctx = use_user_ctx()
  return (
    <div class="w-full h-[48vh] bg-slate-800/5">
      <Sidebar class="p-3 flex flex-col gap-2">
        <div class="flex gap-1">
          <Avatar user={user_ctx.user} />
          <div>
            <div class="font-medium text-sm">{user_ctx.user?.name}</div>
          </div>
          <Cross1Icon
            class="h-fit ml-auto"
            onClick={props.onClose}
          />
        </div>
        <Divider
          class="px-2 my-0.5"
          direction={Direction.Horizonal}
        />
        <div class="flex flex-col">
          <ListItem>
            <PersonIcon />
            <span>Profile</span>
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
          direction={Direction.Horizonal}
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
          <ListItem>
            <ExitIcon />
            <span>Sign Out</span>
          </ListItem>
        </div>
      </Sidebar>
    </div>
  )
}
