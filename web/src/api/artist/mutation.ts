import { useMutation } from "@tanstack/solid-query"

import * as Fetcher from "./fetcher"
import type { NewArtistCorrectionOut } from "./schema"

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: (
			params:
				| { type: "Create"; data: NewArtistCorrectionOut }
				| { type: "Update"; id: number; data: NewArtistCorrectionOut },
		) => {
			return params.type == "Create" ?
					Fetcher.__create({
						data: params.data,
					})
				:	Fetcher.__update({
						id: params.id,
						data: params.data,
					})
		},
		mutationKey: [`artist::mutate`],
		throwOnError: false,
	}))
