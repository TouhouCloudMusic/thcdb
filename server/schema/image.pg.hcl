table "image" {
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

  column "filename" {
    type = text
  }

  column "uploaded_by" {
    type = int
  }
  foreign_key "fk_image_uploaded_by" {
    columns     = [column.uploaded_by]
    ref_columns = [table.user.column.id]
    on_update   = CASCADE
    on_delete   = NO_ACTION
  }

  column "created_at" {
    type    = timestamptz
    default = sql("now()")
  }
}
