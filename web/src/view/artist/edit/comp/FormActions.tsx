import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { ArtistMutation } from "@thc/query"
import { For } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { lineHeights, fontSizes } from "~/style/tokens.stylex"

import { useArtistForm } from "../context"

const styles = stylex.create({
	column: {
		display: "flex",
		flexDirection: "column",
	},
	error: {
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
	},
})

type ArtistFormFormActionsProps = {
	styles?: StyleXStyles
	mutation: ReturnType<typeof ArtistMutation.getInstance>
}

export function ArtistFormActions(props: ArtistFormFormActionsProps) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	return (
		<>
			<Field
				of={formStore}
				path={["description"]}
			>
				{(field) => (
					<InputField.Root styles={props.styles}>
						<InputField.Label>{t`Description`}</InputField.Label>
						<InputField.Textarea
							{...field.props}
							id={field.path.join(".")}
							value={field.input ?? ""}
						/>
						<InputField.Error>{field.errors?.[0]}</InputField.Error>
					</InputField.Root>
				)}
			</Field>

			<Field
				of={formStore}
				path={["type"]}
			>
				{(field) => (
					<InputField.Root styles={props.styles}>
						<InputField.Input
							{...field.props}
							hidden
							id={field.path.join(".")}
							value={field.input ?? ""}
						/>
						<InputField.Error>{field.errors?.[0]}</InputField.Error>
					</InputField.Root>
				)}
			</Field>

			<div {...stylex.attrs(styles.column, props.styles)}>
				<For each={formStore.errors ?? []}>
					{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
				</For>

				<FormComp.ErrorMessage styles={[styles.error]}>
					{props.mutation.isError
						? `Error: ${props.mutation.error.message}`
						: undefined}
				</FormComp.ErrorMessage>
			</div>
		</>
	)
}
