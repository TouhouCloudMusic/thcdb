import { Field } from "@formisch/solid"
import type { ArtistType } from "@thc/api"

import { FormComp } from "~/component/atomic/form"
import { Select } from "~/component/atomic/form/select"

import { useArtistForm } from "../context"

const ARTIST_TYPE_OPTIONS: ("" | ArtistType)[] = ["", "Solo", "Multiple", "Unknown"]

const getArtistTypeLabel = (value: string) =>
	value === "" ? "-- Please select artist type --" : value

export function ArtistFormArtistTypeField() {
	const { formStore } = useArtistForm()

	return (
		<Field
			of={formStore}
			path={["data", "artist_type"]}
		>
			{(field) => (
				<div class="flex flex-col">
					<FormComp.Label>Artist Type</FormComp.Label>
					<div class="w-fit rounded-sm border border-slate-300 font-light">
						<Select.Root<"" | ArtistType>
							name={field.props.name}
							value={(field.input ?? "") as "" | ArtistType}
							onChange={(value) => {
								const next = value ?? ""
								field.onInput(next === "" ? undefined : next)
							}}
							options={ARTIST_TYPE_OPTIONS}
							itemComponent={(props) => (
								<Select.Item item={props.item}>
									{getArtistTypeLabel(props.item.rawValue)}
								</Select.Item>
							)}
						>
							<Select.HiddenSelect
								onChange={field.props.onChange}
								onInput={field.props.onInput}
								onBlur={field.props.onBlur}
								onFocus={field.props.onFocus}
							/>
							<Select.Trigger class="box-border h-8 w-full min-w-max rounded px-1 whitespace-nowrap focus:outline-2 focus:outline-reimu-600">
								<Select.Value<"" | ArtistType>>
									{(state) => getArtistTypeLabel(state.selectedOption() ?? "")}
								</Select.Value>
								<Select.Icon />
							</Select.Trigger>
							<Select.Portal>
								<Select.Content>
									<Select.Listbox />
								</Select.Content>
							</Select.Portal>
						</Select.Root>
					</div>
				</div>
			)}
		</Field>
	)
}
