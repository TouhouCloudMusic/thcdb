table "label" {
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

	column "name" {
		type = text
	}

	column "founded_date" {
		null = true
		type = date
	}

	column "founded_date_precision" {
		type = enum.DatePrecision
		default = "Day"
	}

	column "dissolved_date" {
		null = true
		type = date
	}

	column "dissolved_date_precision" {
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


table "label_localized_name" {
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

	column "label_id" {
		type = int
	}
	foreign_key "fk_label_localized_name_label_id" {
		columns = [ column.label_id ]
		ref_columns = [ table.label.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "language_id" {
		type = int
	}
	foreign_key "fk_label_localized_name_language_id" {
		columns = [ column.language_id ]
		ref_columns = [ table.language.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "name" {
		type = text
	}

	unique "label_language_name" {
		columns = [ column.label_id, column.language_id, column.name ]
	}

}

table "label_founder" {
	schema = schema.public

	column "label_id" {
		type = int
	}
	foreign_key "fk_label_founder_label_id" {
		columns = [ column.label_id ]
		ref_columns = [ table.label.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "artist_id" {
		type = int
	}
	foreign_key "fk_label_founder_artist_id" {
		columns = [ column.artist_id ]
		ref_columns = [ table.artist.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	primary_key {
		columns = [ column.label_id, column.artist_id ]
	}

}

table "label_history" {
	schema = schema.public

	column "prev_id" {
		type = int
	}
	foreign_key "fk_label_history_prev_id" {
		columns = [ column.prev_id ]
		ref_columns = [ table.label.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	column "next_id" {
		type = int
	}
	foreign_key "fk_label_history_next_id" {
		columns = [ column.next_id ]
		ref_columns = [ table.label.column.id ]
		on_update = CASCADE
		on_delete = CASCADE
	}

	primary_key {
		columns = [ column.prev_id, column.next_id ]
	}

}
