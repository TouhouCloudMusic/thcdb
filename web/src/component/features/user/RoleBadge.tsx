import type { UserRoleEnum } from "@thc/api"

import type { AppColor } from "~/component"
import { Badge } from "~/component/atomic/Badge"

type Props = {
	role: UserRoleEnum
}

const ROLE_BADGE_COLOR = {
	Admin: "Reimu",
	Moderator: "Marisa",
	User: "Slate",
} satisfies Record<UserRoleEnum, AppColor>

export function RoleBadge(props: Props) {
	return <Badge color={ROLE_BADGE_COLOR[props.role]}>{props.role}</Badge>
}
