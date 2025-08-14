import { useLingui } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"

import type { NewArtistCorrection } from "~/api/artist/schema"
import { DateWithPrecision } from "~/components/composite/form/DateWithPrecision"

import { useArtistForm } from "../context"

export function ArtistFormDateFields() {
	const { formStore } = useArtistForm()
	const { t } = useLingui()

	return (
		<>
			<DateWithPrecision
				label={t`Start date`}
				setValue={(v) => {
					M.setValue(formStore, "data.start_date", v)
				}}
				error={M.getError(formStore, "data.start_date", {
					shouldActive: false,
				})}
			/>

			<DateWithPrecision
				label={t`End date`}
				setValue={(v) => {
					M.setValue(formStore, "data.end_date", v)
				}}
				error={M.getError(formStore, "data.end_date", {
					shouldActive: false,
				})}
			/>
		</>
	)
}
