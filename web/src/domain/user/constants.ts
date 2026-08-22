// @wc-ignore-file
import type { Permission, UserRoleEnum } from "@thc/api"

export const USER_ROLE_NAMES = {
	Admin: "Admin",
	Moderator: "Moderator",
	User: "User",
} as const satisfies Record<UserRoleEnum, UserRoleEnum>

export const USER_PERMISSION_NAMES = {
	CorrectionManage: "correction.manage",
	CommentManage: "comment.manage",
	ImageQueueManage: "image.queue.manage",
} as const satisfies Record<
	"CorrectionManage" | "CommentManage" | "ImageQueueManage",
	Permission
>
