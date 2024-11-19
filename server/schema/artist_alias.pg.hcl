table "alias_group" {
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
