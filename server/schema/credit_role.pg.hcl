table "credit_role" {
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

  column "short_description" {
    type = text
  }

  column "description" {
    type = text
  }
}

table "credit_role_history" {
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

  column "short_description" {
    type = text
  }

  column "description" {
    type = text
  }
}

table "credit_role_inheritance" {
  schema = schema.public

  column "role_id" {
    type = int
  }
  foreign_key "fk_credit_role_inheritance_child_id" {
    columns     = [column.role_id]
    ref_columns = [table.credit_role.column.id]
    on_update   = CASCADE
  }

  column "parent_id" {
    type = int
  }
  foreign_key "fk_credit_role_inheritance_parent_id" {
    columns     = [column.parent_id]
    ref_columns = [table.credit_role.column.id]
    on_update   = CASCADE
  }

  primary_key {
    columns = [column.role_id, column.parent_id]
  }
}

table "credit_role_inheritance_history" {
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

  column "role_history_id" {
    type = int
  }
  foreign_key "fk_credit_role_inheritance_history_role_history_id" {
    columns     = [column.role_history_id]
    ref_columns = [table.credit_role_history.column.id]
  }

  column "parent_id" {
    type = int
  }
  foreign_key "fk_credit_role_inheritance_history_parent_id" {
    columns     = [column.parent_id]
    ref_columns = [table.credit_role.column.id]
  }
}
