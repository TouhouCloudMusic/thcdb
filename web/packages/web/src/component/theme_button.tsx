import { SunIcon, MoonIcon } from "solid-radix-icons"
import { Switch, Match } from "solid-js"
import { AppTheme, useTheme } from "~/state/theme"
import { Button } from "./button"

export function ThemeButton(props: { class?: string }) {
	const theme = useTheme()
	return (
		<Switch>
			<Match when={theme.value() === AppTheme.light}>
				<Button.Borderless
					class={`flex place-content-center items-center ${props.class}`}
					onClick={() => theme.set(AppTheme.dark)}>
					<SunIcon />
				</Button.Borderless>
			</Match>
			<Match when={theme.value() === AppTheme.dark}>
				<Button.Highlight
					class={`flex place-content-center items-center ${props.class}`}
					onClick={() => theme.set(AppTheme.light)}>
					<MoonIcon />
				</Button.Highlight>
			</Match>
		</Switch>
	)
}
