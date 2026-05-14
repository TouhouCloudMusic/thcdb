// @wc-ignore-file
import type { PermissionName, UserRoleEnum } from "@thc/api"

export const USER_ROLE_NAMES = {
	Admin: "Admin",
	Moderator: "Moderator",
	User: "User",
} as const satisfies Record<UserRoleEnum, UserRoleEnum>

export const USER_PERMISSION_NAMES = {
	CorrectionManage: "correction.manage",
	CommentManage: "comment.manage",
} as const satisfies Record<
	"CorrectionManage" | "CommentManage",
	PermissionName
>

type UserPermissionName =
	(typeof USER_PERMISSION_NAMES)[keyof typeof USER_PERMISSION_NAMES]

type PermissionUser = {
	permissions?: readonly string[] | null
	roles?: readonly { name: string }[] | null
}

export function hasUserPermission(
	user: PermissionUser | undefined,
	permission: UserPermissionName,
) {
	if (!user) return false
	if (user.permissions !== undefined) {
		return user.permissions?.includes(permission) ?? false
	}

	return (
		user.roles?.some(
			(role) =>
				role.name === USER_ROLE_NAMES.Admin
				|| role.name === USER_ROLE_NAMES.Moderator,
		) ?? false
	)
}
