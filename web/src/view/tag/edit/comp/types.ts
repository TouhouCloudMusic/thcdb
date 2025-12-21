import type { FormStore } from "@formisch/solid"

import type { NewTagCorrection } from "~/domain/tag"

export type TagFormStore = FormStore<typeof NewTagCorrection>
