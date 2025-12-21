import { useLingui } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"

import { FormComp } from "~/component/atomic/form"
import { DateWithPrecision } from "~/component/form/DateWithPrecision"

import { useArtistForm } from "../context"

export function ArtistFormDateFields() {
	const { formStore } = useArtistForm()
	const { t } = useLingui()

	return (
		<>
			<div>
				<FormComp.Label>{t`Start date`}</FormComp.Label>
				<div class="flex gap-4">
					<DateWithPrecision
						setValue={(v) => {
							M.setValue(formStore, "data.start_date", v)
						}}
					/>
				</div>
				<FormComp.ErrorMessage>
					{M.getError(formStore, "data.start_date", { shouldActive: false })}
				</FormComp.ErrorMessage>
			</div>

			<div>
				<FormComp.Label>{t`End date`}</FormComp.Label>
				<div class="flex gap-4">
					<DateWithPrecision
						setValue={(v) => {
							M.setValue(formStore, "data.end_date", v)
						}}
					/>
				</div>
				<FormComp.ErrorMessage>
					{M.getError(formStore, "data.end_date", { shouldActive: false })}
				</FormComp.ErrorMessage>
			</div>
		</>
	)
}
