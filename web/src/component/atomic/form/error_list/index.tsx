import type { nil } from "@thc/toolkit/types"
import type { JSX } from "solid-js"
import { For } from "solid-js"

import { ErrorMessage } from "../error_message"

export function ErrorList(props: {
	errors: string[] | nil
	class?: string
}): JSX.Element {
	return (
		<For each={props.errors}>
			{(error) => <ErrorMessage class={props.class}>{error}</ErrorMessage>}
		</For>
	)
}
