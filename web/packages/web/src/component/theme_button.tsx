import { SunIcon, MoonIcon } from "solid-radix-icons"
import { Switch, Match } from "solid-js"
import { AppTheme, useAppState } from "~/state/app_state"
import { Button } from "./button"

export function ThemeButton(props: { class?: string }) {
	const { theme, setTheme } = useAppState()
	return (
		<Switch>
			<Match when={theme() === AppTheme.light}>
				<Button.Borderless
					class={`flex place-content-center items-center ${props.class}`}
					onClick={() => setTheme(AppTheme.dark)}>
					<SunIcon />
				</Button.Borderless>
			</Match>
			<Match when={theme() === AppTheme.dark}>
				<Button.Borderless
					class={`flex place-content-center items-center ${props.class}`}
					onClick={() => setTheme(AppTheme.light)}>
					<MoonIcon />
				</Button.Borderless>
			</Match>
		</Switch>
	)
}
