import { Link } from "@tanstack/solid-router"
import { createMemo, Match, Show, Switch } from "solid-js"
import { HamburgerMenuIcon, MagnifyingGlassIcon } from "solid-radix-icons"
import { Button } from "~/components/button"
import { NotificationState, useUserCtx } from "~/state/user"

import { Avatar } from "../avatar/index.tsx"
import {
  BellAlertIcon,
  BellIcon,
  BellSlashIcon,
} from "../icons/heroicons/24/outline.tsx"
import { Input } from "../input"

const HEADER_BTN_CLASS = "size-6 p-1 m-auto"

export function Header() {
  const Divider = () => <span class="w-[0.5px] bg-slate-400 h-5 ml-3"></span>
  return (
    <header class="bg-primary box-content content-center items-center px-4 py-2 border-b-1 border-slate-400">
      <div class="my-auto flex h-8 items-center justify-between">
        {/* Left */}
        <div class="flex items-center">
          <Button
            variant="Tertiary"
            class={HEADER_BTN_CLASS}
          >
            <Link to="/">
              <HamburgerMenuIcon class={"size-4 m-auto"} />
            </Link>
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
    <div class="grid items-center">
      <Input
        class={`
        bg-slate-100 w-64 h-7 rounded-xs duration-200 pl-2 border-none
        `}
      />
      <MagnifyingGlassIcon class={"size-4 col-start-1 absolute ml-2"} />
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
        <Link
          to="/auth"
          search={{
            type: "sign_in",
          }}
        >
          Sign In
        </Link>
      </Button>
      <Button
        variant="Primary"
        size="Sm"
        class={BTN_CLASS}
      >
        <Link
          to="/auth"
          search={{
            type: "sign_up",
          }}
        >
          Sign Up
        </Link>
      </Button>
    </>
  )
}
