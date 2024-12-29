enum "EntityType" {
  schema = schema.public
  values = [
    "Artist",
    "Label",
    "Release",
    "Song",
    "Tag",
  ]
}

enum "CorrectionType" {
  schema = schema.public
  values = [
    "Create",
    "Update",
    "Delete",
  ]
}

enum "CorrectionStatus" {
  schema = schema.public
  values = [
    "Pending",
    "Approved",
    "Rejected",
  ]
}

enum "CorrectionUserType" {
  schema = schema.public
  values = [
    "Author",
    "Co-Author",
    "Reviewer",
    "Approver",
  ]
}

table "correction" {
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

  column "status" {
    type = enum.CorrectionStatus
  }

  column "type" {
    type = enum.CorrectionType
  }

  column "entity_type" {
    type = enum.EntityType
  }

  column "entity_id" {
    type = int
  }

  column "description" {
    type = text
  }

  column "created_at" {
    type    = timestamptz
    default = sql("now()")
  }

  column "handled_at" {
    type = timestamptz
    null = true
  }
}

table "correction_user" {
  schema = schema.public

  column "correction_id" {
    type = int
  }
  foreign_key "fk_correction_user_correction_id" {
    columns     = [column.correction_id]
    ref_columns = [table.correction.column.id]
  }

  column "user_id" {
    type = int
  }
  foreign_key "fk_correction_user_user_id" {
    columns     = [column.user_id]
    ref_columns = [table.user.column.id]
  }

  column "user_type" {
    type = enum.CorrectionUserType
  }

  primary_key {
    columns = [column.correction_id, column.user_id, column.user_type]
  }
}

table "correction_revision" {
  schema = schema.public

  column "correction_id" {
    type = int
  }
  foreign_key "fk_correction_revision_correction_id" {
    columns     = [column.correction_id]
    ref_columns = [table.correction.column.id]
  }

  column "entity_history_id" {
    type = int
  }

  column "description" {
    type = text
  }

  primary_key {
    columns = [column.correction_id, column.entity_history_id]
  }
}
