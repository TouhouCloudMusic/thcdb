import dayjs from "dayjs"
import type { ParentProps, Signal } from "solid-js"
import {
  createContext,
  createResource,
  createSignal,
  Show,
  Suspense,
} from "solid-js"
import { useContextUnsave } from "~/lib/context"

export enum AppTheme {
  Light,
  Dark,
}

export class ThemeStore {
  private signal: Signal<AppTheme>

  constructor(theme: AppTheme) {
    this.signal = createSignal(theme)
  }

  public get theme(): AppTheme {
    return this.signal[0]()
  }

  public static new(theme: AppTheme) {
    return new ThemeStore(theme)
  }

  public static default() {
    return new ThemeStore(AppTheme.Light)
  }

  public set(theme: AppTheme): void {
    this.signal[1](theme)

    updateTheme(theme)
    // setThemeCookie(theme)
  }
}

export const ThemeContext = createContext<ThemeStore>()
export const useTheme = () => useContextUnsave(ThemeContext)

export function ThemeProvider(props: ParentProps) {
  return (
    <Suspense>
      <ThemeContext.Provider value={ThemeStore.default()}>
        {props.children}
      </ThemeContext.Provider>
    </Suspense>
  )
}

function fromString(str: string) {
  let id = (() => {
    try {
      return parseInt(str)
    } catch {
      return AppTheme.Light
    }
  })()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
  if (AppTheme.Dark == id) {
    return AppTheme.Dark
  } else {
    return AppTheme.Light
  }
}

export function updateTheme(theme: AppTheme) {
  switch (theme) {
    case AppTheme.Dark:
      setDoucmentTheme("dark")
      break
    default:
      setDoucmentTheme("light")
  }
}

// function setThemeCookie(theme: AppTheme) {
//   Cookie.set("app_theme", String(theme), {
//     expires: dayjs().add(30, "days").toDate(),
//   })
// }

function setDoucmentTheme(str: string) {
  document.getElementById("app")!.classList.add("notransition")
  document.documentElement.setAttribute("data-mode", str)
  setTimeout(() => {
    document.getElementById("app")!.classList.remove("notransition")
  }, 0)
}
