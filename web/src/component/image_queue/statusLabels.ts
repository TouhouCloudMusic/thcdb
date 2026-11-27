import { msg } from "@lingui/core/macro"

import type { ImageQueueStatus } from "~/hey-api"

export const IMAGE_QUEUE_STATUS_LABELS = {
	Pending: msg`Pending`,
	Approved: msg`Approved`,
	Rejected: msg`Rejected`,
	Cancelled: msg`Cancelled`,
	Reverted: msg`Reverted`,
} satisfies Record<ImageQueueStatus, ReturnType<typeof msg>>
