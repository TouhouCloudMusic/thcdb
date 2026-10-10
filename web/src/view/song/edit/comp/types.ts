import type { FormStore } from "@formisch/solid"

import type { SongFormSchema } from "../schema"

export type SongFormStore = FormStore<typeof SongFormSchema>
