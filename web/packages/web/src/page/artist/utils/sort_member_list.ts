import * as Option from "fp-ts/Option"
import * as R from "ramda"

interface Member {
	name: string
	leave_year: number | null
	join_year: number | null
}

export function sortMemberList<T extends Member[]>(memberList: T) {
	if (memberList.length === 0) return Option.none
	return Option.some(
		R.sort((a, b) => {
			const a_has_left = a.leave_year == null
			const b_has_left = b.leave_year == null

			// 现役成员排前面
			if (a_has_left !== b_has_left) {
				return a_has_left ? 1 : -1
			}

			// 然后按加入年份排序
			const join_year_diff = (a.join_year ?? 0) - (b.join_year ?? 0)
			if (join_year_diff !== 0) {
				return join_year_diff
			}

			// 然后按离开年份排序
			const leave_year_diff = (a.leave_year ?? 0) - (b.leave_year ?? 0)
			if (leave_year_diff !== 0) {
				return leave_year_diff
			}

			// 最后按名称排序
			return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
		}, memberList) as T
	)
}
