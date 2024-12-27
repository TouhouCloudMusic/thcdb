enum "TagKind" {
  schema = schema.public
  values = [
    "Descriptor",
    "Form",
    "Genre",
    "Scene",
  ]
}

enum "TagRelationType" {
  schema = schema.public
  values = [
    "inherit",
    "derive"
  ]
}

table "tag" {
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

  column "kind" {
    type = enum.TagKind
  }

  column "short_description" {
    type = text
  }

  column "description" {
    type = text
  }

  column "created_at" {
    type    = timestamptz
    default = sql("now()")
  }

  column "updated_at" {
    type    = timestamptz
    default = sql("now()")
  }
}

table "tag_history" {
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

  column "kind" {
    type = enum.TagKind
  }

  column "short_description" {
    type = text
  }

  column "description" {
    type = text
  }

  column "created_at" {
    type    = timestamptz
    default = sql("now()")
  }

  column "updated_at" {
    type    = timestamptz
    default = sql("now()")
  }
}

table "tag_relation" {
  schema = schema.public

  column "parent_id" {
    type = int
  }
  foreign_key "fk_tag_relation_parent_id" {
    columns     = [column.parent_id]
    ref_columns = [table.tag.column.id]
  }

  column "child_id" {
    type = int
  }
  foreign_key "fk_tag_relation_child_id" {
    columns     = [column.child_id]
    ref_columns = [table.tag.column.id]
  }

  column "type" {
    type = enum.TagRelationType
  }

  primary_key {
    columns = [column.parent_id, column.child_id, column.type]
  }
}
