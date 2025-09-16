// 标题字段
import { Field } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import { twMerge } from "tailwind-merge"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"

import type { ReleaseFormStore } from "./types"

export function TitleField(props: { of: ReleaseFormStore; class?: string }) {
	return (
		<Field
			of={props.of}
			path={["data", "title"]}
		>
			{(field) => (
				<InputField.Root class={twMerge("flex flex-col", props.class)}>
					<FormComp.Label>Title</FormComp.Label>
					<InputField.Input
						{...field.props}
						class="mr-2"
						placeholder="Title"
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
