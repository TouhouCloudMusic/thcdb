import { getInput, remove, setInput } from "@formisch/solid"
import { batch } from "solid-js"

import type { ReleaseFormStore } from "./comp/types"

export function removeTrack(form: ReleaseFormStore, removedIndex: number) {
	const credits = getInput(form, { path: ["data", "credits"] })
	batch(() => {
		for (const [creditIndex, credit] of credits.entries()) {
			if (credit.on === null || credit.on === undefined) continue
			setInput(form, {
				path: ["data", "credits", creditIndex, "on"],
				input: credit.on
					.filter((index) => index !== removedIndex)
					.map((index) => (index > removedIndex ? index - 1 : index)),
			})
		}
		remove(form, { path: ["data", "tracks"], at: removedIndex })
	})
}
