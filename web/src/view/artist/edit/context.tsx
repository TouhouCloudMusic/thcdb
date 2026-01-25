import type { FormStore } from "@formisch/solid"
import { createContext } from "solid-js"
import type { ParentProps } from "solid-js"

import type { NewArtistCorrection } from "~/domain/artist"
import { assertContext } from "~/utils/solid/assertContext"

type ArtistFormSchema = typeof NewArtistCorrection

export type ArtistEditFormContextValue = {
	artistId: number | undefined
	formStore: FormStore<ArtistFormSchema>
}

const ArtistEditFormContext = createContext<ArtistEditFormContextValue>()

export function ArtistFormProvider(
	props: ParentProps<{ value: ArtistEditFormContextValue }>,
) {
	return (
		// eslint-disable-next-line solid/reactivity
		<ArtistEditFormContext.Provider value={props.value}>
			{props.children}
		</ArtistEditFormContext.Provider>
	)
}

export const useArtistForm = () => assertContext(ArtistEditFormContext)
