import { type ComponentProps, createMemo, Match, Switch } from "solid-js"
import { MoonIcon, SunIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"
import { AppTheme, useTheme } from "~/state/theme"

import { Button } from "./button"

// @tw
const defaultStyle = `flex place-content-center items-center`

export function ThemeButton(
  props: Omit<ComponentProps<"button">, "onClick" | "children" | "color">,
) {
  let theme_ctx = useTheme()

  let class_list = createMemo(() => twMerge(defaultStyle, props.class))

  return (
    <Switch>
      <Match when={theme_ctx.theme === AppTheme.Light}>
        <Button
          {...props}
          variant="Tertiary"
          class={class_list()}
          onClick={() => theme_ctx.set(AppTheme.Dark)}
        >
          <SunIcon />
        </Button>
      </Match>
      <Match when={theme_ctx.theme === AppTheme.Dark}>
        <Button
          {...props}
          variant="Tertiary"
          class={class_list()}
          onClick={() => theme_ctx.set(AppTheme.Light)}
        >
          <MoonIcon />
        </Button>
      </Match>
    </Switch>
  )
}
