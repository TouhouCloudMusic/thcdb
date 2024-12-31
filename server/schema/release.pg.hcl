enum "ReleaseType" {
  schema = schema.public
  values = [
    "Album",
    "EP",
    "Single",
    "Compilation",
    "Demo",
    "Other",
  ]
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
    columns = [column.id]
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
    type    = enum.DatePrecision
    default = "Day"
  }

  column "recording_date_start" {
    null = true
    type = date
  }

  column "recording_date_start_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  column "recording_date_end" {
    null = true
    type = date
  }

  column "recording_date_end_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  column "created_at" {
    type    = timestamptz
    default = sql("now()")
  }

  column "updated_at" {
    type    = timestamptz
    default = sql("now()")
  }

}

table "release_history" {
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
    type    = enum.DatePrecision
    default = "Day"
  }

  column "recording_date_start" {
    null = true
    type = date
  }

  column "recording_date_start_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  column "recording_date_end" {
    null = true
    type = date
  }

  column "recording_date_end_precision" {
    type    = enum.DatePrecision
    default = "Day"
  }

  column "created_at" {
    type    = timestamptz
    default = sql("now()")
  }

  column "updated_at" {
    type    = timestamptz
    default = sql("now()")
  }
}

table "release_artist" {
  schema = schema.public

  column "release_id" {
    type = int
  }
  foreign_key "fk_release_artist_release_id" {
    columns     = [column.release_id]
    ref_columns = [table.release.column.id]
  }

  column "artist_id" {
    type = int
  }
  foreign_key "fk_release_artist_artist_id" {
    columns     = [column.artist_id]
    ref_columns = [table.artist.column.id]
  }

  primary_key {
    columns = [column.release_id, column.artist_id]
  }

}

table "release_artist_history" {
  schema = schema.public

  column "history_id" {
    type = int
  }
  foreign_key "fk_release_artist_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.release.column.id]
  }

  column "artist_id" {
    type = int
  }
  foreign_key "fk_release_artist_history_artist_id" {
    columns     = [column.artist_id]
    ref_columns = [table.artist.column.id]
  }

  primary_key {
    columns = [column.history_id, column.artist_id]
  }

}

table "release_localized_title" {
  schema = schema.public

  column "release_id" {
    type = int
  }
  foreign_key "fk_release_id_release_id" {
    columns     = [column.release_id]
    ref_columns = [table.release.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "language_id" {
    type = int
  }
  foreign_key "fk_release_id_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "title" {
    type = text
  }

  primary_key {
    columns = [column.release_id, column.language_id, column.title]
  }

}

table "release_localized_title_history" {
  schema = schema.public

  column "history_id" {
    type = int
  }
  foreign_key "fk_release_history_localized_title_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.release.column.id]
  }

  column "language_id" {
    type = int
  }
  foreign_key "fk_release_history_localized_title_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
  }

  column "title" {
    type = text
  }

  primary_key {
    columns = [column.history_id, column.language_id, column.title]
  }

}

table "release_label" {
  schema = schema.public

  column "release_id" {
    type = int
  }
  foreign_key "fk_release_label_release_id" {
    columns     = [column.release_id]
    ref_columns = [table.release.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "label_id" {
    type = int
  }
  foreign_key "fk_release_label_label_id" {
    columns     = [column.label_id]
    ref_columns = [table.label.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

	primary_key {
		columns = [ column.release_id, column.label_id ]
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
	foreign_key "fk_release_track_song_id" {
		columns = [column.song_id]
		ref_columns = [table.song.column.id]
		on_delete = RESTRICT
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

    index "idx_release_track_song_id" {
    columns = [column.song_id]
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
    columns = [column.id]
  }

  column "artist_id" {
    type = int
  }

  column "release_id" {
    type = int
  }
  foreign_key "fk_release_credit_release_id" {
    columns     = [column.release_id]
    ref_columns = [table.release.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "role_id" {
    type = int
  }
  foreign_key "fk_release_credit_role_id" {
    columns     = [column.role_id]
    ref_columns = [table.credit_role.column.id]
    on_update   = CASCADE
    on_delete   = SET_NULL
  }

  column "on" {
    type = sql("smallint[]")
    null = true
  }
}

table "release_credit_history" {
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

  column "artist_id" {
    type = int
  }

  column "release_history_id" {
    type = int
  }
  foreign_key "fk_release_credit_history_release_history_id" {
    columns     = [column.release_history_id]
    ref_columns = [table.release_history.column.id]
  }

  column "role_id" {
    type = int
  }
  foreign_key "fk_release_credit_role_id" {
    columns     = [column.role_id]
    ref_columns = [table.credit_role.column.id]
  }

  column "on" {
    type = sql("smallint[]")
    null = true
  }
}

table "release_label_history" {
  schema = schema.public

  column "history_id" {
    type = int
  }
  foreign_key "fk_release_label_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.release.column.id]
  }

  column "label_id" {
    type = int
  }
  foreign_key "fk_release_label_history_label_id" {
    columns     = [column.label_id]
    ref_columns = [table.label.column.id]
  }

  primary_key {
    columns = [column.history_id, column.label_id]
  }
}

view "orphaned_songs" {          //孤立检查
  schema = schema.public
  
  column "id" {
    type = int
  }
  
  column "title" {
    type = text
  }

  sql = <<-SQL
    SELECT s.id, s.title
    FROM song s
    LEFT JOIN release_track rt ON s.id = rt.song_id
    WHERE rt.id IS NULL
  SQL

  comment = "This view identifies songs that are not associated with any release"
}

