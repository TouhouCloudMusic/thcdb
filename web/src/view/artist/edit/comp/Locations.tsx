import { setInput } from "@formisch/solid"

import { Location } from "~/component/form/Location"

import { useArtistForm } from "../context"

export function ArtistFormLocationFields() {
	const { formStore } = useArtistForm()

	return (
		<>
			<Location
				label="Start Location"
				setValue={(v) => {
					setInput(formStore, { path: ["data", "start_location"], input: v })
				}}
			/>
			<Location
				label="Current Location"
				setValue={(v) => {
					setInput(formStore, { path: ["data", "current_location"], input: v })
				}}
			/>
		</>
	)
}
