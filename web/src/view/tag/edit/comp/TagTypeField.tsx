import { Field } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { TagType } from "@thc/api"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { FormComp, Select } from "~/component/atomic"

import { useTagForm } from "../context"

const TAG_TYPES: TagType[] = ["Descriptor", "Genre", "Movement", "Scene"]

type Props = {
	class?: string
}

export function TagFormTypeField(props: Props) {
	const { formStore } = useTagForm()

	return (
		<Field
			of={formStore}
			path={["data", "type"]}
		>
			{(field) => (
				<div class={twMerge("flex flex-col", props.class)}>
					<FormComp.Label>
						<Trans>Tag Type</Trans>
					</FormComp.Label>
					<Select
						{...field.props}
						value={field.input}
					>
						<Select.Option
							value=""
							selected={!field.input}
						>
							-- Please Select Type --{" "}
						</Select.Option>
						<For each={TAG_TYPES}>
							{(type) => (
								<Select.Option
									value={type}
									selected={field.input === type}
								>
									{type}
								</Select.Option>
							)}
						</For>
					</Select>
					<For each={field.errors}>
						{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
					</For>
				</div>
			)}
		</Field>
	)
}
