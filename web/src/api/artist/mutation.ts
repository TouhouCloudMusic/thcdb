import { useMutation } from "@tanstack/solid-query"

import * as Fetcher from "./fetcher"
import type { NewArtistCorrectionOut } from "./schema"

export const create = () =>
	useMutation(() => ({
		mutationFn: (data: NewArtistCorrectionOut) => {
			return Fetcher.__create({
				data,
			})
		},
		mutationKey: ["artist::create"],
		throwOnError: false,
	}))
