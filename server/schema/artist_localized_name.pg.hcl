table "artist_localized_name" {
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

	column "artist_id" {
		type = int
	}
	foreign_key "fk_artist_localized_name_artist_id" {
		columns = [ column.artist_id ]
		ref_columns = [ table.artist.column.id ]
	}

	column "language_id" {
		type = int
	}
	foreign_key "fk_artist_localized_name_language_id" {
		columns = [ column.language_id ]
		ref_columns = [ table.language.column.id ]
		on_delete = SET_NULL
	}

	column "name" {
		type = text
	}
}

table "artist_localized_name_history" {
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

	column "artist_history_id" {
		type = int
	}
	foreign_key "fk_artist_localized_name_history_artist_id" {
		columns = [ column.artist_history_id ]
		ref_columns = [ table.artist_history.column.id ]
	}

	column "language_id" {
		type = int
	}
	foreign_key "fk_artist_localized_name_history_language_id" {
		columns = [ column.language_id ]
		ref_columns = [ table.language.column.id ]
		on_delete = SET_NULL
	}

	column "name" {
		type = text
	}
}
