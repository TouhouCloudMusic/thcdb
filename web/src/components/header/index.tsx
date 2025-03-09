import { createMemo, Match, Show, Switch } from "solid-js"
import { HamburgerMenuIcon, MagnifyingGlassIcon } from "solid-radix-icons"
import { Button } from "~/components/button"
import {
  BellAlertIcon,
  BellIcon,
  BellSlashIcon,
} from "../icons/heroicons/24/outline.tsx"
import { Avatar } from "../avatar/index.tsx"

import { NotificationState, useUserCtx } from "~/state/user"

const HEADER_BTN_CLASS = "size-6 p-1 m-auto"

export function Header() {
  const Divider = () => <span class="w-[0.5px] bg-slate-400 h-5 ml-3"></span>
  return (
    <header class="bg-primary box-content h-12 content-center items-center px-4 py-2">
      <div class="my-auto flex h-8 items-center justify-between">
        {/* Left */}
        <div class="flex items-center">
          <Button
            variant="Tertiary"
            class={HEADER_BTN_CLASS}
          >
            <HamburgerMenuIcon class={"size-4 m-auto"} />
          </Button>
          <Divider />
        </div>

        {/* Right	*/}
        <div class="flex place-content-center items-center gap-3 shrink">
          <SearchBar />
          <Divider />
          <Show
            when={useUserCtx().user}
            fallback={<UnauthenticatedButtons />}
          >
            {(user) => (
              <>
                <div class="h-8 w-8 grid place-items-center">
                  <NotificationButton />
                </div>
                <Avatar user={user()} />
              </>
            )}
          </Show>
        </div>
      </div>
    </header>
  )
}

function SearchBar() {
  return (
    <div
      class={`
    bg-slate-100 w-64 min-w-min max-h-full h-8 my-2 rounded-xs flex items-center place-content-start
    hover:ring-1 hover:ring-reimu-600 pl-2.5 duration-250
    `}
    >
      <MagnifyingGlassIcon class={"size-4"} />
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
          <BellIcon class={"size-4 m-auto"} />
        </Match>
        <Match when={notification_state() === NotificationState.Unread}>
          <BellAlertIcon class={"size-4 m-auto"} />
        </Match>
        <Match when={notification_state() === NotificationState.Muted}>
          <BellSlashIcon class={"size-4 m-auto"} />
        </Match>
      </Switch>
    </Button>
  )
}

function UnauthenticatedButtons() {
  // @tw
  const BTN_CLASS = "w-18 max-h-full text-sm"
  return (
    <>
      <Button
        variant="Tertiary"
        size="Sm"
        class={BTN_CLASS.concat(" ", "text-slate-900")}
      >
        Sign In
      </Button>
      <Button
        variant="Primary"
        size="Sm"
        class={BTN_CLASS}
      >
        Sign Up
      </Button>
    </>
  )
}
