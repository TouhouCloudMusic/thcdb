enum "TagType" {
  schema = schema.public
  // 目前来说，Form和Topic能放在Descriptor下
  values = [
    "Descriptor",
    // "Form",
    "Genre",
    "Movement",
    "Scene",
    // "Topic",
  ]
}

enum "TagRelationType" {
  schema = schema.public
  values = [
    "Inherit",
    "Derive"
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

  column "type" {
    type = enum.TagType
  }

  column "short_description" {
    type = text
  }

  column "description" {
    type = text
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

  column "type" {
    type = enum.TagType
  }

  column "short_description" {
    type = text
  }

  column "description" {
    type = text
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
