import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { MoonIcon, SunIcon } from "@thc/icons/radix"
import { Match, Switch, splitProps } from "solid-js"
import type { ComponentProps } from "solid-js"

import { Button } from "~/component/atomic/button"
import { AppTheme, useTheme } from "~/state/theme"

const styles = stylex.create({
	root: { display: "flex", placeContent: "center", alignItems: "center" },
})

export function ThemeButton(
	props: Omit<
		ComponentProps<"button">,
		"onClick" | "children" | "color" | "class"
	> & { styles?: StyleXStyles },
) {
	const theme_ctx = useTheme()
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Switch>
			<Match when={theme_ctx.theme === AppTheme.Light}>
				<Button
					{...others}
					onClick={() => theme_ctx.set(AppTheme.Dark)}
					appearance="ghost"
					tone="gray"
					styles={[styles.root, local.styles]}
				>
					<SunIcon />
				</Button>
			</Match>
			<Match when={theme_ctx.theme === AppTheme.Dark}>
				<Button
					{...others}
					onClick={() => theme_ctx.set(AppTheme.Light)}
					appearance="ghost"
					tone="gray"
					styles={[styles.root, local.styles]}
				>
					<MoonIcon />
				</Button>
			</Match>
		</Switch>
	)
}
