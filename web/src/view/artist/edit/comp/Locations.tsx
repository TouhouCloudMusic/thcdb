import { setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"

import { Location } from "~/component/form/Location"

import { useArtistForm } from "../context"

export function ArtistFormLocationFields(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	return (
		<>
			<Location
				styles={props.styles}
				label={t`Start Location`}
				setValue={(v) => {
					// @ts-expect-error formisch inference still treats optional input as null-only.
					setInput(formStore, { path: ["data", "start_location"], input: v })
				}}
			/>
			<Location
				styles={props.styles}
				label={t`Current Location`}
				setValue={(v) => {
					// @ts-expect-error formisch inference still treats optional input as null-only.
					setInput(formStore, { path: ["data", "current_location"], input: v })
				}}
			/>
		</>
	)
}
