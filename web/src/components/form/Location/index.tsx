import { For } from "solid-js"

import { FormComp } from "~/components/atomic/form"
import { InputField } from "~/components/atomic/form/Input"
import type { Location as LocationType } from "~/domain/shared"

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
