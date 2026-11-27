import { useInfiniteQuery } from "@tanstack/solid-query"
import {
	createFileRoute,
	getRouteApi,
	useNavigate,
} from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import * as v from "valibot"

import { pendingImageQueueInfiniteOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { vImageQueueStatus, vImageQueueType } from "~/hey-api/valibot.gen"
import { IMAGE_QUEUE_PAGE_SIZE, imageQueueListState } from "~/query/imageQueue"
import { ImageQueueManagePageContent } from "~/view/image_queue/manage"

const statusSearchValues = {
	all: "all",
	Pending: "pending",
	Approved: "approved",
	Rejected: "rejected",
	Cancelled: "cancelled",
	Reverted: "reverted",
} as const

const searchSchema = v.object({
	type: v.fallback(v.optional(vImageQueueType), undefined),
	status: v.fallback(v.optional(v.enum(statusSearchValues)), undefined),
})

const route = getRouteApi("/image-queue/")

function RouteComponent() {
	const search = route.useSearch()
	const navigate = useNavigate({ from: "/image-queue/" })
	const statusFilter = createMemo(() => {
		const status = search().status ?? statusSearchValues.Pending
		return vImageQueueStatus.options.find(
			(option) => statusSearchValues[option] === status,
		)
	})
	const listQuery = useInfiniteQuery(() => {
		const request = {
			query: {
				limit: IMAGE_QUEUE_PAGE_SIZE,
				type: search().type,
				status: statusFilter(),
			},
		}

		return {
			...pendingImageQueueInfiniteOptions(request),
			initialPageParam: request,
			getNextPageParam: ({ data: { next_cursor } }) => next_cursor,
		}
	})
	const list = createMemo(() => imageQueueListState(listQuery))

	return (
		<ImageQueueManagePageContent
			filters={{ type: search().type, status: statusFilter() }}
			list={list()}
			onTypeChange={(type) => {
				void navigate({
					to: "/image-queue",
					search: { ...search(), type },
				})
			}}
			onStatusChange={(status) => {
				void navigate({
					to: "/image-queue",
					search: {
						...search(),
						status: statusSearchValues[status ?? "all"],
					},
				})
			}}
		/>
	)
}

export const Route = createFileRoute("/image-queue/")({
	component: RouteComponent,
	validateSearch: searchSchema,
})
