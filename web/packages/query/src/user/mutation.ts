import { useMutation } from "@tanstack/solid-query"

export function uploadAvatar(_file: File) {
	let mutation = useMutation(() => ({
		mutationFn: (_data: File) => {
			// TODO: Implement avatar upload using @thc/api when available
			throw new Error("Avatar upload not implemented yet")
		},
	}))

	return mutation
}
