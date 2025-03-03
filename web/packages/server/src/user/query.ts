import { eq, getTableColumns, sql } from "drizzle-orm"
import { role_table, user, user_role_table, type Session } from "~/database"
import { type Image } from "~/database/image/typebox"
import { image_table, session } from "~/database/schema"
import { db } from "~/service/database/connection"

const select_user_role_query = db.$with("select_user_role_query").as(
  db
    .select({
      user_id: user_role_table.user_id,
      role_id: user_role_table.role_id,
      role_name: role_table.name,
    })
    .from(user_role_table)
    .leftJoin(role_table, eq(user_role_table.role_id, role_table.id)),
)

const shared_select_columns = {
  ...getTableColumns(user),
  role: sql<string[]>`
    array_agg(${select_user_role_query.role_name})
    filter (where ${select_user_role_query.role_name} is not null)
  `.as("role"),
  avatar: sql<Image | null>`
    json_agg(${image_table})
    filter (where ${image_table} is not null) -> 0
  `.as("avatar"),
}

export const select_user_query = db
  .$with("select_user_query")
  .as(
    db
      .with(select_user_role_query)
      .select(shared_select_columns)
      .from(user)
      .leftJoin(
        select_user_role_query,
        eq(user.id, select_user_role_query.user_id),
      )
      .leftJoin(image_table, eq(user.avatar_id, image_table.id))
      .groupBy(user.id),
  )

export const select_user_with_session_query = db
  .$with("select_user_with_session_query")
  .as(
    db
      .with(select_user_role_query)
      .select({
        ...shared_select_columns,
        session: sql<Session | null>`
          json_agg(distinct ${session})
          filter (where ${session} is not null) -> 0
        `.as("session"),
      })
      .from(user)
      .leftJoin(
        select_user_role_query,
        eq(user.id, select_user_role_query.user_id),
      )
      .leftJoin(image_table, eq(user.avatar_id, image_table.id))
      .leftJoin(session, eq(user.id, session.user_id))
      .groupBy(user.id),
  )
