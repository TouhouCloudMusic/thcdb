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

enum "ChangeRequestType" {
  schema = schema.public
  values = [
    "Create",
    "Update",
    "Delete",
  ]
}

enum "ChangeRequestStatus" {
  schema = schema.public
  values = [
    "Pending",
    "Approved",
    "Rejected",
  ]
}

table "change_request" {
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

  column "request_status" {
    type = enum.ChangeRequestStatus
  }

  column "request_type" {
    type = enum.ChangeRequestType
  }

  column "entity_type" {
    type = enum.EntityType
  }

  column "description" {
    type = text
  }

  column "created_at" {
    type    = timestamptz
    default = sql("now()")
  }

  column "handled_at" {
    type    = timestamptz
    default = sql("now()")
  }
}

enum "ChangeRequestUserType" {
  schema = schema.public
  values = [
    "Author",
    "Co-Author",
    "Reviewer",
    "Approver",
  ]
}

table "change_request_user" {
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

  column "change_request_id" {
    type = int
  }
  foreign_key "fk_change_request_co_author_change_request_id" {
    columns     = [column.change_request_id]
    ref_columns = [table.change_request.column.id]
  }

  column "user_id" {
    type = int
  }
  foreign_key "fk_change_request_co_author_co_author" {
    columns     = [column.user_id]
    ref_columns = [table.user.column.id]
  }

  column "user_type" {
    type = enum.ChangeRequestUserType
  }

  unique "unique_request_user_and_user_type" {
    columns = [column.change_request_id, column.user_id, column.user_type]
  }
}

table "change_request_revision" {
  schema = schema.public

  column "change_request_id" {
    type = int
  }
  foreign_key "fk_change_request_revision_change_request_id" {
    columns     = [column.change_request_id]
    ref_columns = [table.change_request.column.id]
  }

  column "entity_history_id" {
    type = int
  }

  primary_key {
    columns = [column.change_request_id, column.entity_history_id]
  }
}

table "change_request_description_revision" {
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

  column "change_request_id" {
    type = int
  }
  foreign_key "fk_change_request_description_revision_change_request_id" {
    columns     = [column.change_request_id]
    ref_columns = [table.change_request.column.id]
  }

  column "content" {
    type = text
  }

  column "created_at" {
    type    = timestamptz
    default = sql("now()")
  }
}
