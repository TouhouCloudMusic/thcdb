import { useQueryClient } from "@tanstack/solid-query"
import { useNavigate } from "@tanstack/solid-router"
import type { Tag } from "@thc/api"
import { TagMutation, TagQueryOption } from "@thc/query"
import type { InferOutput } from "valibot"

import type { NewTagCorrection } from "~/domain/tag"

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			tag: Tag
	  }

export function createTagFormSubmission(props: Props) {
	const navigator = useNavigate()
	const queryClient = useQueryClient()
	const mutation = TagMutation.getInstance()

	const handleSubmit = (output: InferOutput<typeof NewTagCorrection>) => {
		if (props.type === "new") {
			mutation.mutate(
				{ type: "Create", data: output },
				{
					onSuccess() {
						void queryClient.invalidateQueries({
							queryKey: [TagQueryOption.QUERY_KEYS.DETAIL_KEYWORD],
						})
						void navigator({ to: `/` })
					},
					onError(error) {
						if (import.meta.env.DEV) {
							console.error("Failed to create tag:", error)
						}
					},
				},
			)
			return
		}

		mutation.mutate(
			{ type: "Update", id: props.tag.id, data: output },
			{
				onSuccess() {
					void queryClient.invalidateQueries({
						queryKey: [TagQueryOption.QUERY_KEYS.DETAIL_ID, props.tag.id],
					})
					void navigator({ to: `/tag/${props.tag.id}` })
				},
				onError(error) {
					if (import.meta.env.DEV) {
						console.error("Failed to update tag:", error)
					}
				},
			},
		)
	}

	return {
		handleSubmit,
		mutation,
	}
}
