import { useQueryClient } from "@tanstack/solid-query"
import { useNavigate } from "@tanstack/solid-router"
import { LabelMutation, LabelQueryOption } from "@thc/query"
import type { InferOutput } from "valibot"

import type { NewLabelCorrection } from "~/domain/label"

import type { LabelFormInitProps as Props } from "./init"

export function createLabelFormSubmission(props: Props) {
	const navigator = useNavigate()
	const queryClient = useQueryClient()
	const mutation = LabelMutation.getInstance()

	const handleSubmit = (output: InferOutput<typeof NewLabelCorrection>) => {
		if (props.type === "new") {
			mutation.mutate(
				{ type: "Create", data: output },
				{
					onSuccess() {
						void queryClient.invalidateQueries({
							queryKey: [LabelQueryOption.QUERY_KEYS.DETAIL_KEYWORD],
						})
						void navigator({ to: "/" })
					},
					onError(error) {
						if (import.meta.env.DEV) {
							console.error("Failed to create label:", error)
						}
					},
				},
			)
			return
		}

		mutation.mutate(
			{ type: "Update", id: props.label.id, data: output },
			{
				onSuccess() {
					void queryClient.invalidateQueries({
						queryKey: [LabelQueryOption.QUERY_KEYS.DETAIL_ID, props.label.id],
					})
					void navigator({ to: `/label/${props.label.id}` })
				},
				onError(error) {
					if (import.meta.env.DEV) {
						console.error("Failed to update label:", error)
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
