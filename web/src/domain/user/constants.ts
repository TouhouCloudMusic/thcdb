// @wc-ignore-file
import type { UserRoleEnum } from "@thc/api"

export const USER_ROLE_NAMES = {
	Admin: "Admin",
	Moderator: "Moderator",
	User: "User",
} as const satisfies Record<UserRoleEnum, UserRoleEnum>
