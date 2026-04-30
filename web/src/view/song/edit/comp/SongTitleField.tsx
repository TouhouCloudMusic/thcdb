import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { twMerge } from "tailwind-merge"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"

import type { SongFormStore } from "./types"

export function SongTitleField(props: { of: SongFormStore; class?: string }) {
	const { t } = useLingui()
	return (
		<Field
			of={props.of}
			path={["data", "title"]}
		>
			{(field) => (
				<InputField.Root class={twMerge("flex flex-col", props.class)}>
					<FormComp.Label>{t`Title`}</FormComp.Label>
					<InputField.Input
						{...field.props}
						placeholder={t`Title`}
						value={field.input ?? undefined}
					/>
					<InputField.Error>
						{field.errors ? field.errors[0] : undefined}
					</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}
