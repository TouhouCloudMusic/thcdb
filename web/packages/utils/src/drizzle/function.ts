import {
  and,
  is,
  SQL,
  sql,
  type AnyColumn,
  type GetColumnData,
  type SelectedFields,
} from "drizzle-orm"
import { PgTimestampString } from "drizzle-orm/pg-core"
import type { SelectResultFields } from "drizzle-orm/query-builders/select.types"

function jsonBuildObject<T extends SelectedFields<any, any>>(shape: T) {
  const chunks: SQL[] = []

  for (const [key, value] of Object.entries(shape)) {
    if (!value) continue
    if (chunks.length > 0) {
      chunks.push(sql.raw(`,`))
    }
    chunks.push(sql.raw(`'${key}',`))
    if (is(value, PgTimestampString)) {
      chunks.push(sql`timezone('UTC', ${value})`)
    } else {
      chunks.push(sql`${value}`)
    }
  }

  return sql<SelectResultFields<T>>`json_build_object(${sql.join(chunks)})`
}

export function coalesce<T>(value: SQL.Aliased<T> | SQL<T>, defaultValue: SQL) {
  return sql<T>`coalesce(${value}, ${defaultValue})`
}

export function jsonAgg<T extends SelectedFields<any, any>>(
  shape: T,
  options?: {
    orderBy?: { colName: AnyColumn; direction: "ASC" | "DESC" }
  },
) {
  return sql<SelectResultFields<T>[]>`coalesce(
			json_agg(${jsonBuildObject(shape)}
			${
        options?.orderBy ?
          sql`ORDER BY ${options.orderBy.colName} ${sql.raw(
            options.orderBy.direction,
          )}`
        : undefined
      })
			FILTER (WHERE ${and(
        sql.join(
          Object.values(shape)
            .filter((value) => value)
            .map((value) => sql`${sql`${value}`} IS NOT NULL`),
          sql` AND `,
        ),
      )})
			,'${sql`[]`}')`
}

export function jsonAggFirst<T extends SelectedFields<any, any>>(
  shape: T,
  options?: {
    orderBy?: { colName: AnyColumn; direction: "ASC" | "DESC" }
  },
) {
  return sql<SelectResultFields<T>>`coalesce(
			json_agg(${jsonBuildObject(shape)}
			${
        options?.orderBy ?
          sql`ORDER BY ${options.orderBy.colName} ${sql.raw(
            options.orderBy.direction,
          )}`
        : undefined
      })
			FILTER (WHERE ${and(
        sql.join(
          Object.values(shape)
            .filter((value) => value)
            .map((value) => sql`${sql`${value}`} IS NOT NULL`),
          sql` AND `,
        ),
      )})
			,'${sql`[]`}') -> 0`
}

export function arrayAgg<Column extends AnyColumn>(column: Column) {
  return coalesce<GetColumnData<Column, "raw">[]>(
    sql`json_agg(distinct ${sql`${column}`}) filter (where ${column} is not null)`,
    sql`'[]'`,
  )
}
