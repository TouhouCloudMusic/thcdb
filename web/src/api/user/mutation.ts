import { useMutation } from "@tanstack/solid-query"

import { FetchClient } from ".."

export function uploadAvatar(file: File) {
	let mutation = useMutation(() => ({
		mutationFn: (data: File) => {
			let formData = new FormData()
			formData.append("file", file)

			return FetchClient.POST(`/avatar`, {
				body: {
					data,
				},
			})
		},
	}))

	return mutation
}
