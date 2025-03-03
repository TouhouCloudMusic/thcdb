import { createSignal, Match, Switch } from "solid-js"
import { HamburgerMenuIcon } from "solid-radix-icons"
import { TertiaryButton } from "~/component/button/index.tsx"
import {
  BellAlertIcon,
  BellIcon,
  BellSlashIcon,
} from "../icons/heroicons/24/outline.tsx"
import { ThemeButton } from "../theme_button.tsx"

// @tw
const badgeClass =
  "rounded-sm border text-gray-600 size-7 flex place-items-center place-content-center"

const enum NotificationState {
  None,
  Unread,
  Muted,
}

const iconSize = {
  width: 16,
  height: 16,
}

export function Header() {
  const [notificationState] = createSignal(NotificationState.None)

  return (
    <header class="bg-primary box-content h-10 content-center items-center px-4 py-2">
      <div class="my-auto flex h-8 items-center justify-between">
        {/* Left */}
        <div class="flex items-center">
          <button class={badgeClass}>
            <HamburgerMenuIcon {...iconSize} />
          </button>
          <a
            href="/"
            class="mx-4 size-8 place-content-center rounded-full bg-gray-300 text-center text-[0.5rem] text-white"
          >
            LOGO
          </a>
        </div>
        {/* Right	*/}
        <div class="ml-4 flex items-center gap-2 md:ml-6">
          <ThemeButton class={badgeClass} />
          <TertiaryButton
            type="button"
            class={badgeClass}
          >
            <Switch>
              <Match when={notificationState() === NotificationState.None}>
                <BellIcon {...iconSize} />
              </Match>
              <Match when={notificationState() === NotificationState.Unread}>
                <BellAlertIcon {...iconSize} />
              </Match>
              <Match when={notificationState() === NotificationState.Muted}>
                <BellSlashIcon {...iconSize} />
              </Match>
            </Switch>
          </TertiaryButton>
        </div>
      </div>
    </header>
  )
}
