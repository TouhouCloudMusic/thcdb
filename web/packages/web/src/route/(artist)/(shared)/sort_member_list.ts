import * as R from "ramda"

interface MemberList {
	name: string
	join_year?: number | null
	leave_year?: number | null
}
/**
 *
 * @param memberList
 * @returns Return sorted array, if array is empty, return empty array
 */
export function sortMemberList<T extends MemberList[]>(memberList: T) {
	return R.sort((a, b) => {
		const aLeft = a.leave_year == null
		const bLeft = b.leave_year == null

		// 现役成员排前面
		if (aLeft !== bLeft) {
			return aLeft ? 1 : -1
		}

		// 然后按加入年份排序
		const joinYearDiff = (a.join_year ?? 0) - (b.join_year ?? 0)
		if (joinYearDiff !== 0) {
			return joinYearDiff
		}

		// 然后按离开年份排序
		const leaveYearDiff = (a.leave_year ?? 0) - (b.leave_year ?? 0)
		if (leaveYearDiff !== 0) {
			return leaveYearDiff
		}

		// 最后按名称排序
		return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
	}, memberList) as T
}
