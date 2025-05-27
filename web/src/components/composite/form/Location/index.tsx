import { For } from "solid-js"

import type { Location as LocationType } from "~/api/shared/schema"
import { FormComp } from "~/components/common/form"
import { InputField } from "~/components/common/form/Input"

export type LocationProps = {
	label: string
	setValue(val?: LocationType): void
}
export function Location(props: LocationProps) {
	return (
		<div>
			<FormComp.Label>{props.label}</FormComp.Label>
			<div class="flex gap-4">
				<For
					each={[
						{
							name: "Country / Region",
						},
						{
							name: "Province",
						},
						{
							name: "City",
						},
					]}
				>
					{(props) => (
						<InputField.Root>
							<InputField.Input placeholder={props.name} />
						</InputField.Root>
					)}
				</For>
			</div>
		</div>
	)
}
