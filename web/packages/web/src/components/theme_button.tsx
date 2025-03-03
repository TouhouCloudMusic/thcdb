import { type ComponentProps, createMemo, Match, Switch } from "solid-js"
import { MoonIcon, SunIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"
import { AppTheme, useTheme } from "~/state/theme"
import { TertiaryButton } from "./button/index.tsx"

// @tw
const defaultStyle = `flex place-content-center items-center`

export function ThemeButton(
  props: Omit<ComponentProps<"button">, "onClick" | "children" | "color">,
) {
  const theme = useTheme()

  const twClass = createMemo(() => twMerge(defaultStyle, props.class))

  return (
    <Switch>
      <Match when={theme.theme() === AppTheme.Light}>
        <TertiaryButton
          {...props}
          class={twClass()}
          onClick={() => theme.set(AppTheme.Dark)}
        >
          <SunIcon />
        </TertiaryButton>
      </Match>
      <Match when={theme.theme() === AppTheme.Dark}>
        <TertiaryButton
          {...props}
          class={twClass()}
          onClick={() => theme.set(AppTheme.Light)}
        >
          <MoonIcon />
        </TertiaryButton>
      </Match>
    </Switch>
  )
}
