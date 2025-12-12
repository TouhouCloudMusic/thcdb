import type { FormStore } from "@formisch/solid"

import type { NewLabelCorrection } from "~/domain/label"

type LabelFormSchema = typeof NewLabelCorrection

export type LabelFormStore = FormStore<LabelFormSchema>
