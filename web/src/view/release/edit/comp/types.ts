import type { FormStore } from "@formisch/solid"

import type { NewReleaseCorrection } from "~/domain/release"

export type ReleaseFormStore = FormStore<typeof NewReleaseCorrection>
