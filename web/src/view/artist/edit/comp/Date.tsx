import { useLingui } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"

import { DateWithPrecision } from "~/component/form/DateWithPrecision"
import type { NewArtistCorrection } from "~/domain/artist/schema"

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
