/* eslint-disable @typescript-eslint/no-explicit-any */
import e from "@touhouclouddb/database"
import { type $expr_Operator } from "@touhouclouddb/database/reflection.js"

type exprs = ($expr_Operator<any, any> | boolean)[]
export function combineOp(
	operator: string,
	...exprs: exprs
): $expr_Operator<any, any> | undefined {
	if (exprs.length === 0) {
		return undefined
	}

	if (exprs.length === 1) {
		return exprs[0] as $expr_Operator<any, any>
	}

	return e.op(
		// @ts-expect-error
		exprs[0],
		operator as never,
		combineOp(operator, ...exprs.slice(1))
	)
}

export function op_and(...exprs: exprs): $expr_Operator<any, any> | undefined {
	return combineOp("and", ...exprs)!
}

export function op_or(...exprs: exprs): $expr_Operator<any, any> | undefined {
	return combineOp("or", ...exprs)!
}
