import type { FormStore } from "@formisch/solid"

import type { NewSongCorrection } from "~/domain/song"

export type SongFormStore = FormStore<typeof NewSongCorrection>
