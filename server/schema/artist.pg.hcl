enum "ArtistType" {
	schema = schema.public
	values = [ "Person", "Group" ]
}

table "artist" {
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

	column "entity_id" {
		type = int
	}

	column "status" {
		type = enum.EntityStatus
	}

	column "name" {
		type = text
	}

	column "artist_type" {
		type = enum.ArtistType
	}

	column "text_alias" {
		null = true
		type = sql("text[]")
	}

	column "start_date" {
		null = true
		type = date
	}

	column "start_date_precision" {
		null = true
		type = enum.DatePrecision
	}

	column "end_date" {
		null = true
		type = date
	}

	column "end_date_precision" {
		null = true
		type = enum.DatePrecision
	}

	column "created_at" {
		type = timestamptz
		default = sql("now()")
	}

	column "updated_at" {
		type = timestamptz
		default = sql("now()")
	}
}

table "artist_history" {
	schema = schema.public

	column "prev_id" {
		type = int
	}
	foreign_key "fk_artist_history_prev_id" {
		columns = [ column.prev_id ]
		ref_columns = [ table.artist.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "next_id" {
		type = int
	}
	foreign_key "fk_artist_history_next_id" {
		columns = [ column.next_id ]
		ref_columns = [ table.artist.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	primary_key {
		columns = [ column.prev_id, column.next_id ]
	}
}

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
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "language_id" {
		type = int
	}
	foreign_key "fk_artist_localized_name_language_id" {
		columns = [ column.language_id ]
		ref_columns = [ table.language.column.id ]
		on_update = CASCADE
		on_delete = SET_NULL
	}

	column "name" {
		type = text
	}

	unique "artist_language_name" {
		columns = [ column.artist_id, column.language_id, column.name ]
	}
}

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

	column "entity_id" {
		type = int
	}

	column "artist_id" {
		type = int
	}

}

table "alias_group_history" {
	schema = schema.public

	column "prev_id" {
		type = int
	}
	foreign_key "fk_alias_group_prev_id" {
		columns = [ column.prev_id ]
		ref_columns = [ table.alias_group.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "next_id" {
		type = int
	}
	foreign_key "fk_alias_group_next_id" {
		columns = [ column.next_id ]
		ref_columns = [ table.alias_group.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	primary_key {
		columns = [ column.prev_id, column.next_id ]
	}

}

table "group_member" {
	schema = schema.public

	column "member_id" {
		type = int
	}
	foreign_key "fk_group_member_member_id" {
		columns = [ column.member_id ]
		ref_columns = [ table.artist.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "group_id" {
		type = int
	}
	foreign_key "fk_group_member_group_id" {
		columns = [ column.group_id ]
		ref_columns = [ table.artist.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	primary_key {
		columns = [ column.member_id, column.group_id ]
	}
}
