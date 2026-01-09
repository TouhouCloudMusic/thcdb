import * as M from "@modular-forms/solid"

import { Location } from "~/component/form/Location"

import { useArtistForm } from "../context"

export function ArtistFormLocationFields() {
	const { formStore } = useArtistForm()

	return (
		<>
			<Location
				label="Start Location"
				setValue={(v) => {
					M.setValue(formStore, "data.start_location", v)
				}}
			/>
			<Location
				label="Current Location"
				setValue={(v) => {
					M.setValue(formStore, "data.current_location", v)
				}}
			/>
		</>
	)
}
