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

table "tag_alternative_name" {
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

  column "tag_id" {
    type = int
  }
  foreign_key "fk_tag_alternative_name_tag_id" {
    columns     = [column.tag_id]
    ref_columns = [table.tag.column.id]
  }

  column "name" {
    type = text
  }

  column "is_origin_language" {
    type = bool
  }

  column "language_id" {
    type = int
    null = true
  }

  foreign_key "fk_tag_alternative_name_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
  }
}


table "tag_alternative_name_history" {
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

  column "history_id" {
    type = int
  }
  foreign_key "fk_tag_alternative_name_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.tag_history.column.id]
  }

  column "name" {
    type = text
  }

  // TODO: rename it to `is_translation` and refactor codes
  column "is_origin_language" {
    type = bool
  }

  column "language_id" {
    type = int
    null = true
  }

  foreign_key "fk_tag_alternative_name_history_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
  }
}


table "tag_relation" {
  schema = schema.public

  column "tag_id" {
    type = int
  }
  foreign_key "fk_tag_relation_tag_id" {
    columns     = [column.tag_id]
    ref_columns = [table.tag.column.id]
  }

  column "related_tag_id" {
    type = int
  }
  foreign_key "fk_tag_relation_related_tag_id" {
    columns     = [column.related_tag_id]
    ref_columns = [table.tag.column.id]
  }

  column "type" {
    type = enum.TagRelationType
  }

  primary_key {
    columns = [column.related_tag_id, column.tag_id, column.type]
  }
}

table "tag_relation_history" {
  schema = schema.public

  column "history_id" {
    type = int
  }
  foreign_key "fk_tag_relation_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.tag_history.column.id]
  }

  column "related_tag_id" {
    type = int
  }
  foreign_key "fk_tag_relation_history_related_tag_id" {
    columns     = [column.related_tag_id]
    ref_columns = [table.tag.column.id]
  }

  column "type" {
    type = enum.TagRelationType
  }

  primary_key {
    columns = [column.related_tag_id, column.history_id, column.type]
  }
}
