import { SunIcon, MoonIcon } from "solid-radix-icons"
import { Switch, Match } from "solid-js"
import { AppTheme, useAppState } from "~/state/app.state"

export function ThemeButton(props: { class?: string }) {
	const { theme, setTheme } = useAppState()
	return (
		<Switch>
			<Match when={theme() === AppTheme.light}>
				<button
					class={`button place-content-center flex items-center ${props.class}`}
					onClick={() => setTheme(AppTheme.dark)}>
					<SunIcon />
				</button>
			</Match>
			<Match when={theme() === AppTheme.dark}>
				<button
					class={`button place-content-center flex items-center ${props.class}`}
					onClick={() => setTheme(AppTheme.light)}>
					<MoonIcon />
				</button>
			</Match>
		</Switch>
	)
}
