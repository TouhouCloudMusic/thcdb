enum "ArtistType" {
	schema = schema.public
	values = [ "Solo", "Multiple", "Unknown" ]
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

table "artist_link" {
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
  foreign_key "fk_artist_link_artist_id" {
    columns = [ column.artist_id ]
    ref_columns = [ table.artist.column.id ]
  }

  column "link_id" {
    type = int
  }
  foreign_key "fk_artist_link_link_id" {
    columns = [ column.link_id ]
    ref_columns = [ table.link.column.id ]
  }
}

table "artist_link_history" {
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
  foreign_key "fk_artist_link_history_history_id" {
    columns = [ column.history_id ]
    ref_columns = [ table.artist_history.column.id ]
  }

  column "link_id" {
    type = int
  }
  foreign_key "fk_artist_link_history_link_id" {
    columns = [ column.link_id ]
    ref_columns = [ table.link.column.id ]
  }
}
