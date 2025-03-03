/* eslint-disable @typescript-eslint/no-explicit-any */
import e from "@touhouclouddb/database"
import {
  type $expr_Operator,
  type BaseType,
  type Cardinality,
} from "@touhouclouddb/database/reflection.js"

export function combine_op(
  operator: string,
  ...exprs: $expr_Operator<any, any>[]
): $expr_Operator<any, any> | undefined {
  if (exprs.length === 0) {
    return undefined
  }

  if (exprs.length === 1) {
    return exprs[0]
  }

  return e.op(
    // @ts-expect-error
    exprs[0],
    operator as never,
    combine_op(operator, ...exprs.slice(1)),
  )
}

export function op_and<T extends BaseType, U extends Cardinality>(
  ...exprs: $expr_Operator<T, U>[]
): $expr_Operator<T, U> {
  return combine_op("and", ...exprs) as $expr_Operator<T, U>
}

export function op_or<T extends BaseType, U extends Cardinality>(
  ...exprs: $expr_Operator<T, U>[]
): $expr_Operator<T, U> {
  return combine_op("or", ...exprs) as $expr_Operator<T, U>
}
