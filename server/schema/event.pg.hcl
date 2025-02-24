table "event" {
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

  column "start_date" {
    type = date
    null = true
  }

  column "start_date_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  column "end_date" {
    type = date
    null = true
  }

  column "end_date_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  check "validate_date" {
    expr = <<EOT
    (end_date IS NOT NULL)
    AND
    (start_date IS NOT NULL)
    AND
    (end_date > start_date)
    EOT
  }
}

table "event_history" {
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

  column "start_date" {
    type = date
    null = true
  }

  column "start_date_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  column "end_date" {
    type = date
    null = true
  }

  column "end_date_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  check "validate_date" {
    expr = <<EOT
    (end_date IS NOT NULL)
    AND
    (start_date IS NOT NULL)
    AND
    (end_date > start_date)
    EOT
  }
}

table "event_alternative_name" {
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

  column "event_id" {
    type = int
  }
  foreign_key "fk_event_alternative_name_event_id" {
    columns     = [column.event_id]
    ref_columns = [table.event.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "name" {
    type = text
  }

  column "type" {
    type = enum.AlternativeNameType
  }

  column "language_id" {
    type = int
    null = true
  }
  foreign_key "fk_event_alternative_name_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
  }

  check "language_ref" {
    expr = <<EOT
    type = 'Localization'
      AND
      language_id IS NOT NULL
    OR
    type = 'Alias'
      AND
      language_id IS NULL
    EOT
  }
}

table "event_alternative_name_history" {
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
  foreign_key "fk_event_alternative_name_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.event_history.column.id]
  }

  column "name" {
    type = text
  }

  column "type" {
    type = enum.AlternativeNameType
  }

  column "language_id" {
    type = int
    null = true
  }
  foreign_key "fk_event_alternative_name_history_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
  }

  check "language_ref" {
    expr = <<EOT
    type = 'Localization'
      AND
      language_id IS NOT NULL
    OR
    type = 'Alias'
      AND
      language_id IS NULL
    EOT
  }
}
