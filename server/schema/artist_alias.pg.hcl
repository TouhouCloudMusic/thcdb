table "artist_alias" {
  schema = schema.public

  column "first_id" {
    type = int
  }
  foreign_key "fk_artist_alias_first_id" {
    columns = [ column.first_id ]
    ref_columns = [ table.artist.column.id ]
  }

  column "second_id" {
    type = int
  }
  foreign_key "fk_artist_alias_second_id" {
    columns = [ column.second_id ]
    ref_columns = [ table.artist.column.id ]
  }

  primary_key {
    columns = [ column.first_id, column.second_id ]
  }

  check "unique_relationship" {
    expr = "first_id < second_id"
  }
}

table "artist_alias_history" {
  schema = schema.public

  column "id" {
    type = int
    identity {
      generated = BY_DEFAULT
    }
  }
  primary_key {
    columns = [ column.id ]
  }

  column "history_id" {
    type = int
  }
  foreign_key "fk_artist_alias_history_history_id" {
    columns = [ column.history_id ]
    ref_columns = [ table.artist_history.column.id ]
  }

  column "alias_id" {
    type = int
  }
  foreign_key "fk_artist_alias_history_alias_id" {
    columns = [ column.alias_id ]
    ref_columns = [ table.artist.column.id ]
  }
}
