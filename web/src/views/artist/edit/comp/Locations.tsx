import { useLingui } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"

import { Location } from "~/components/form/Location"
import type { NewArtistCorrection } from "~/domain/artist/schema"

import { useArtistForm } from "../context"

export function ArtistFormLocationFields() {
	const { formStore } = useArtistForm()
	const { t } = useLingui()

	return (
		<>
			<Location
				label={t`Start Location`}
				setValue={(v) => {
					M.setValue(formStore, "data.start_location", v)
				}}
			/>
			<Location
				label={t`Current Location`}
				setValue={(v) => {
					M.setValue(formStore, "data.current_location", v)
				}}
			/>
		</>
	)
}
