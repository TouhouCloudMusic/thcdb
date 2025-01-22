table "label" {
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

  column "founded_date" {
    null = true
    type = date
  }

  column "founded_date_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  column "dissolved_date" {
    null = true
    type = date
  }

  column "dissolved_date_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

}

table "label_history" {
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

  column "founded_date" {
    null = true
    type = date
  }

  column "founded_date_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  column "dissolved_date" {
    null = true
    type = date
  }

  column "dissolved_date_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }
}

table "label_founder" {
  schema = schema.public

  column "label_id" {
    type = int
  }
  foreign_key "fk_label_founder_label_id" {
    columns     = [column.label_id]
    ref_columns = [table.label.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "artist_id" {
    type = int
  }
  foreign_key "fk_label_founder_artist_id" {
    columns     = [column.artist_id]
    ref_columns = [table.artist.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  primary_key {
    columns = [column.label_id, column.artist_id]
  }

}

table "label_founder_history" {
  schema = schema.public

  column "history_id" {
    type = int
  }
  foreign_key "fk_label_founder_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.label.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "artist_id" {
    type = int
  }
  foreign_key "fk_label_founder_artist_id" {
    columns     = [column.artist_id]
    ref_columns = [table.artist.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  primary_key {
    columns = [column.history_id, column.artist_id]
  }

}

table "label_localized_name" {
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

  column "label_id" {
    type = int
  }
  foreign_key "fk_label_localized_name_label_id" {
    columns     = [column.label_id]
    ref_columns = [table.label.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "language_id" {
    type = int
  }
  foreign_key "fk_label_localized_name_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "name" {
    type = text
  }

  unique "unique_label_localized_name" {
    columns = [column.label_id, column.language_id, column.name]
  }

}

table "label_localized_name_history" {
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
  foreign_key "fk_label_localized_name_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.label_history.column.id]
  }

  column "language_id" {
    type = int
  }
  foreign_key "fk_label_localized_name_history_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "name" {
    type = text
  }

  unique "unique_label_localized_name_history" {
    columns = [column.history_id, column.language_id, column.name]
  }
}
