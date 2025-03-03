import { RelationalQueryBuilder } from "drizzle-orm/pg-core/query-builders/query"

export * from "./function.ts"
export type FindFirstQueryConfig<T extends RelationalQueryBuilder<any, any>> =
  NonNullable<Parameters<T["findFirst"]>[0]>
export type FindManyQueryConfig<T extends RelationalQueryBuilder<any, any>> =
  Parameters<T["findMany"]>[0]
