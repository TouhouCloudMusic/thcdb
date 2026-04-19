import { t } from "@lingui/core/macro"
import { For } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
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
							name: t`Country / Region`,
						},
						{
							name: t`Province`,
						},
						{
							name: t`City`,
						},
					]}
				>
					{(item) => (
						<InputField.Root>
							<InputField.Input placeholder={item.name} />
						</InputField.Root>
					)}
				</For>
			</div>
		</div>
	)
}
