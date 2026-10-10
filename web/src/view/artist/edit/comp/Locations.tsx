import { useField } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"

import { Location } from "~/component/form/Location"

import { useArtistForm } from "../context"

export function ArtistFormLocationFields(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()
	const startLocation = useField(formStore, {
		path: ["data", "start_location"],
	})
	const currentLocation = useField(formStore, {
		path: ["data", "current_location"],
	})

	return (
		<>
			<Location
				styles={props.styles}
				label={t`Start Location`}
				value={startLocation.input}
				setValue={startLocation.onInput}
			/>
			<Location
				styles={props.styles}
				label={t`Current Location`}
				value={currentLocation.input}
				setValue={currentLocation.onInput}
			/>
		</>
	)
}
