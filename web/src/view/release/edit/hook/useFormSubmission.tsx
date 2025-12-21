import { useNavigate } from "@tanstack/solid-router"
import type { Release } from "@thc/api"
import { ReleaseMutation } from "@thc/query"
import type { InferOutput } from "valibot"

import type { NewReleaseCorrection } from "~/domain/release"

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			release: Release
	  }

export function useReleaseFormSubmission(props: Props) {
	const navigator = useNavigate()
	const mutation = ReleaseMutation.getInstance()

	// TODO: error handling
	const handleSubmit = (data: InferOutput<typeof NewReleaseCorrection>) => {
		if (props.type === "new") {
			mutation.mutate(
				{ type: "Create", data },
				{
					onSuccess() {
						void navigator({ to: "/" })
					},
					onError(error) {
						if (import.meta.env.DEV) {
							console.error("Failed to create release:", error)
						}
					},
				},
			)
		} else {
			mutation.mutate(
				{ type: "Update", id: props.release.id, data },
				{
					onSuccess() {
						void navigator({ to: `/release/${props.release.id}` })
					},
					onError(error) {
						if (import.meta.env.DEV) {
							console.error("Failed to update release:", error)
						}
					},
				},
			)
		}
	}

	return { handleSubmit, mutation }
}
