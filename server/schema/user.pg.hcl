table "user" {
  schema = schema.public

  column "id" {
    null = false
    type = int
    identity {
      generated = BY_DEFAULT
    }
  }
  primary_key {
    columns = [column.id]
  }

  column "name" {
    null = false
    type = text
  }

  column "password" {
    null = false
    type = text
  }

  column "avatar_id" {
    type = int
    null = true
  }
  foreign_key "fk_user_avatar_id" {
    columns     = [column.avatar_id]
    ref_columns = [table.image.column.id]
    on_update   = CASCADE
    on_delete   = SET_NULL
  }

  index "idx_name" {
    columns = [column.name]
    unique  = true
  }
}

table "role" {
  schema = schema.public

  column "id" {
    type = int
    identity {
      generated = BY_DEFAULT
    }
  }
  primary_key {
    columns = [column.id]
  }

  column "name" {
    type = text
  }
}

table "user_role" {
  schema = schema.public

  column "user_id" {
    type = int
  }
  foreign_key "fk_user_role_user_id" {
    columns     = [column.user_id]
    ref_columns = [table.user.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "role_id" {
    type = int
  }
  foreign_key "fk_user_role_role_id" {
    columns     = [column.role_id]
    ref_columns = [table.role.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  primary_key {
    columns = [column.user_id, column.role_id]
  }
}
