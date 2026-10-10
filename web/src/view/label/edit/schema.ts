import * as v from "valibot"

import { NewLabel } from "~/domain/label/schema"
import { NewCorrection } from "~/domain/shared/schema"
import { ArtistReference, LocalizedName } from "~/view/entity/schema"

export const LabelFormSchema = NewCorrection(
	v.pipe(
		v.object({
			...NewLabel.entries,
			founders: v.array(ArtistReference),
			localized_names: v.nullish(v.array(LocalizedName)),
		}),
		v.transform(({ founders, ...data }) => ({
			...data,
			founders: founders.map((founder) => founder.id),
		})),
	),
)

export type LabelFormInput = v.InferInput<typeof LabelFormSchema>
