import type { ComponentProps } from "solid-js"

import type { ImageQueueDetail } from "~/hey-api"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"

import type { ImageQueueSubmissionInfo } from "../submission"

export type ImageQueueSubscription = {
	isSubscribed: boolean
	disabled: boolean
	toggle: () => void
}

export type ImageQueueDetailViewProps = {
	detail: ImageQueueDetail
	review?: ComponentProps<typeof ImageQueueSubmissionInfo>["review"]
	comments: EntityCommentsModel
	subscription: ImageQueueSubscription
}
