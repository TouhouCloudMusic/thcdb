import type { StyleXStyles } from "@stylexjs/stylex"
import type { nil } from "@thc/toolkit/types"
import type { JSX } from "solid-js"
import { For } from "solid-js"

import { ErrorMessage } from "../error_message"

export function ErrorList(props: {
	errors: string[] | nil
	styles?: StyleXStyles
}): JSX.Element {
	return (
		<For each={props.errors}>
			{(error) => (
				<ErrorMessage
					styles={props.styles}
					as="li"
				>
					{error}
				</ErrorMessage>
			)}
		</For>
	)
}
