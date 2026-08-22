import type { UserProfile } from "@thc/api"

import type { USER_PERMISSION_NAMES } from "./constants"
import { USER_ROLE_NAMES } from "./constants"

type UserPermission =
	(typeof USER_PERMISSION_NAMES)[keyof typeof USER_PERMISSION_NAMES]

export type UserAuthorization = Pick<UserProfile, "permissions" | "roles">

export function hasAdminRole(authorization?: UserAuthorization) {
	return (
		authorization?.roles?.some((role) => role.name === USER_ROLE_NAMES.Admin)
		?? false
	)
}

export function hasUserPermission(
	authorization: UserAuthorization | undefined,
	permission: UserPermission,
) {
	if (!authorization) return false
	if (authorization.permissions !== undefined) {
		return authorization.permissions.includes(permission)
	}

	return (
		authorization.roles?.some(
			(role) =>
				role.name === USER_ROLE_NAMES.Admin
				|| role.name === USER_ROLE_NAMES.Moderator,
		) ?? false
	)
}
