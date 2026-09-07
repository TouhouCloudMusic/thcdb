import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Navigate } from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"
import {
	createMemo,
	createResource,
	createSignal,
	Match,
	onCleanup,
	onMount,
	Show,
	Switch,
} from "solid-js"

import { useCurrentUser } from "~/state/user"
import { colors, lineHeights, fontSizes } from "~/style/tokens.stylex"

// TODO: Move to comps
const styles = stylex.create({
	loading: {
		display: "block",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
})

export function NotSignedIn(props: ParentProps) {
	const { t } = useLingui()
	const currentUser = useCurrentUser()
	const initialized = createMemo<boolean>(
		(previous) => previous || currentUser.session.status !== "loading",
		false,
	)
	const [showHint, setShowHint] = createSignal(false)
	let shownAt: number | undefined
	let revealTimer: ReturnType<typeof setTimeout> | undefined
	let settleTimer: ReturnType<typeof setTimeout> | undefined
	const [ready] = createResource(
		initialized,
		async () => {
			clearTimeout(revealTimer)
			if (shownAt !== undefined) {
				const remaining = Math.max(0, 300 - (Date.now() - shownAt))
				await new Promise<void>((resolve) => {
					settleTimer = setTimeout(resolve, remaining)
				})
			}
			return true
		},
		{ initialValue: false },
	)

	onMount(() => {
		if (initialized()) return
		revealTimer = setTimeout(() => {
			shownAt = Date.now()
			setShowHint(true)
		}, 300)
	})
	onCleanup(() => {
		clearTimeout(revealTimer)
		clearTimeout(settleTimer)
	})

	return (
		<Switch>
			<Match when={!ready.latest}>
				<div aria-busy="true">
					<Show when={showHint()}>
						<output {...stylex.attrs(styles.loading)}>{t`Loading…`}</output>
					</Show>
				</div>
			</Match>
			<Match when={currentUser.session.status === "authenticated"}>
				<Navigate to="/" />
			</Match>
			<Match when={ready.latest}>{props.children}</Match>
		</Switch>
	)
}
