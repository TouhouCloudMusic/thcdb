import * as Option from "fp-ts/Option"

interface Member {
	name: string
	active_year?:
		| {
				lower?: number | null | undefined
				upper?: number | null | undefined
		  }[]
		| null
		| undefined
}

export function sortMemberList<T extends Member>(
	memberList: T[]
): Option.Option<T[]> {
	const get_join_year = (m: T) => m.active_year?.[0].lower
	const get_leave_year = (m: T): number | null => {
		if (!m.active_year) return null
		else return m.active_year[m.active_year.length - 1].upper ?? null
	}

	const compareFn = (a: T, b: T) => {
		const a_join_year = get_join_year(a)
		const a_leave_year = get_leave_year(a)
		const b_join_year = get_join_year(b)
		const b_leave_year = get_leave_year(b)

		const a_has_left = a_leave_year == null
		const b_has_left = b_leave_year == null

		// 现役成员排前面
		if (a_has_left !== b_has_left) {
			return a_has_left ? 1 : -1
		}

		// 然后按加入年份排序
		const join_year_diff = (a_join_year ?? 0) - (b_join_year ?? 0)
		if (join_year_diff !== 0) {
			return join_year_diff
		}

		// 然后按离开年份排序
		const leave_year_diff = (a_leave_year ?? 0) - (b_leave_year ?? 0)
		if (leave_year_diff !== 0) {
			return leave_year_diff
		}

		// 最后按名称排序
		return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
	}

	if (memberList.length === 0) return Option.none
	return Option.some(memberList.toSorted(compareFn))
}
