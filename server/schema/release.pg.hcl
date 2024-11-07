enum "ReleaseType" {
	schema = schema.public
	values = [ "Album", "Single", "EP", "Compilation", "Demo", "Other" ]
}

table "release" {
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

	column "entity_id" {
		type = int
	}

	column "status" {
		type = enum.EntityStatus
	}

	column "title" {
		type = text
	}

	column "release_type" {
		type = enum.ReleaseType
	}

	column "release_date" {
		null = true
		type = date
	}

	column "release_date_precision" {
		type = enum.DatePrecision
		default = "Day"
	}

	column "recording_date_start" {
		null = true
		type = date
	}

	column "recording_date_precision" {
		type = enum.DatePrecision
		default = "Day"
	}

	column "recording_date_end" {
		null = true
		type = date
	}

	column "recording_date_end_precision" {
		type = enum.DatePrecision
		default = "Day"
	}

	column "created_at" {
		type = timestamptz
		default =  sql("now()")
	}

	column "updated_at" {
		type = timestamptz
		default =  sql("now()")
	}

}

table "release_localized_title" {
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

	column "release_id" {
		type = int
	}
	foreign_key "fk_release_id_release_id" {
		columns = [ column.release_id ]
		ref_columns = [ table.release.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "language_id" {
		type = int
	}
	foreign_key "fk_release_id_language_id" {
		columns = [ column.language_id ]
		ref_columns = [ table.language.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "title" {
		type = text
	}

	unique "release_language_title" {
		columns = [ column.release_id, column.language_id, column.title ]
	}

}

table "release_artist" {
	schema = schema.public

	column "release_id" {
		type = int
	}
	foreign_key "fk_release_artist_release_id" {
		columns = [ column.release_id ]
		ref_columns = [ table.release.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "artist_id" {
		type = int
	}
	foreign_key "fk_release_artist_artist_id" {
		columns = [ column.artist_id ]
		ref_columns = [ table.artist.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	primary_key {
		columns = [ column.release_id, column.artist_id ]
	}

}

table "release_label" {
	schema = schema.public

	column "release_id" {
		type = int
	}
	foreign_key "fk_release_label_release_id" {
		columns = [ column.release_id ]
		ref_columns = [ table.release.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "label_id" {
		type = int
	}
	foreign_key "fk_release_label_label_id" {
		columns = [ column.label_id ]
		ref_columns = [ table.label.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	primary_key {
		columns = [ column.release_id, column.label_id ]
	}

}


table "release_history" {
	schema = schema.public

	column "prev_id" {
		type = int
	}
	foreign_key "fk_release_history_prev_id" {
		columns = [ column.prev_id ]
		ref_columns = [ table.release.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "next_id" {
		type = int
	}
	foreign_key "fk_release_history_next_id" {
		columns = [ column.next_id ]
		ref_columns = [ table.release.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	primary_key {
		columns = [ column.prev_id, column.next_id ]
	}

}

table "release_track" {
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

	column "release_id" {
		type = int
	}
	foreign_key "fk_release_track_release_id" {
		columns = [ column.release_id ]
		ref_columns = [ table.release.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "song_id" {
		type = int
	}

	column "track_order" {
		type = smallint
	}

	column "track_number" {
		type = text
		null = true
	}

	column "title" {
		type = text
		null = true
	}

}

table "release_track_artist" {
	schema = schema.public

	column "track_id" {
		type = int
	}
	foreign_key "fk_release_track_artist_track_id" {
		columns = [ column.track_id ]
		ref_columns = [ table.release_track.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "artist_id" {
		type = int
	}

	primary_key {
		columns = [ column.track_id, column.artist_id ]
	}
}


table "release_credit" {
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

	column "release_id" {
		type = int
	}
	foreign_key "fk_release_credit_release_id" {
		columns = [ column.release_id ]
		ref_columns = [ table.release.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "role_id" {
		type = int
	}
	foreign_key "fk_release_credit_role_id" {
		columns = [ column.role_id ]
		ref_columns = [ table.credit_role.column.id ]
		on_update = CASCADE
		on_delete = SET_NULL
	}

	column "on" {
		type = sql("int[]")
		null = true
	}
}
