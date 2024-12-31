table "song" {
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

  column "release_id" {
    type = int
  }
  foreign_key "fk_song_release_id" {
    columns     = [column.release_id]
    ref_columns = [table.release.column.id]
  }

  column "title" {
    type = text
  }

  column "duration" {
    type = interval
    null = true
  }

  column "track_number" {
    type = text
    null = true
  }
  trigger "prevent_orphan_song_deletion" {
    on_table = table.song
    before_delete = true
    for_each_row = true
    condition = <<-SQL
      EXISTS (
        SELECT 1 FROM release_track 
        WHERE release_track.song_id = OLD.id
      )
    SQL
    action = <<-SQL
      RAISE EXCEPTION 'Cannot delete song that is associated with a release';
    SQL
  }
}

table "song_history" {
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

  column "release_history_id" {
    type = int
  }
  foreign_key "fk_song_history_release_history_id" {
    columns     = [column.release_history_id]
    ref_columns = [table.release_history.column.id]
  }

  column "title" {
    type = text
  }

  column "duration" {
    type = interval
    null = true
  }

  column "track_number" {
    type = text
    null = true
  }
}

table "song_artist" {
  schema = schema.public

  column "song_id" {
    type = int
  }
  foreign_key "fk_song_artist_song_id" {
    columns     = [column.song_id]
    ref_columns = [table.song.column.id]
  }

  column "artist_id" {
    type = int
  }
  foreign_key "fk_song_artist_artist_id" {
    columns     = [column.artist_id]
    ref_columns = [table.artist.column.id]
  }

  primary_key {
    columns = [column.song_id, column.artist_id]
  }
}

table "song_artist_history" {
  schema = schema.public

  column "history_id" {
    type = int
  }
  foreign_key "fk_song_artist_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.song_history.column.id]
  }

  column "artist_id" {
    type = int
  }
  foreign_key "fk_song_artist_history_artist_id" {
    columns     = [column.artist_id]
    ref_columns = [table.artist.column.id]
  }

  primary_key {
    columns = [column.history_id, column.artist_id]
  }
}

table "song_language" {
  schema = schema.public

  column "song_id" {
    type = int
  }
  foreign_key "fk_song_language_song_id" {
    columns     = [column.song_id]
    ref_columns = [table.song.column.id]
  }

  column "language_id" {
    type = int
  }
  foreign_key "fk_song_language_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
  }

  primary_key {
    columns = [column.song_id, column.language_id]
  }
}

table "song_language_history" {
  schema = schema.public

  column "history_id" {
    type = int
  }
  foreign_key "fk_song_language_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.song_history.column.id]
  }

  column "language_id" {
    type = int
  }
  foreign_key "fk_song_language_history_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
  }

  primary_key {
    columns = [column.history_id, column.language_id]
  }
}

table "song_localized_title" {
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

  column "song_id" {
    type = int
  }
  foreign_key "fk_song_localized_title_song_id" {
    columns     = [column.song_id]
    ref_columns = [table.song.column.id]
  }

  column "language_id" {
    type = int
  }
  foreign_key "fk_song_localized_title_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
  }

  column "value" {
    type = text
  }

}

table "song_localized_title_history" {
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
  foreign_key "fk_song_localized_title_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.song_history.column.id]
  }

  column "language_id" {
    type = int
  }
  foreign_key "fk_song_localized_title_history_language_id" {
    columns     = [column.language_id]
    ref_columns = [table.language.column.id]
  }

  column "value" {
    type = text
  }
}

table "song_credit" {
  schema = schema.public

  column "song_id" {
    type = int
  }
  foreign_key "fk_song_credit_song_id" {
    columns     = [column.song_id]
    ref_columns = [table.song.column.id]
    on_update   = CASCADE
    on_delete   = CASCADE
  }

  column "artist_id" {
    type = int
  }

  column "role_id" {
    type = int
  }
  foreign_key "fk_song_credit_role_id" {
    columns     = [column.role_id]
    ref_columns = [table.credit_role.column.id]
    on_update   = CASCADE
    on_delete   = SET_NULL
  }

  primary_key {
    columns = [column.artist_id, column.song_id, column.role_id]
  }
}

table "song_credit_history" {
  schema = schema.public

  column "history_id" {
    type = int
  }
  foreign_key "fk_song_credit_history_history_id" {
    columns     = [column.history_id]
    ref_columns = [table.song_history.column.id]
  }

  column "artist_id" {
    type = int
  }
  foreign_key "fk_song_credit_history_artist_id" {
    columns     = [column.artist_id]
    ref_columns = [table.artist.column.id]
  }

  column "role_id" {
    type = int
  }
  foreign_key "fk_song_credit_history_role_id" {
    columns     = [column.role_id]
    ref_columns = [table.credit_role.column.id]
  }

  primary_key {
    columns = [column.history_id, column.artist_id, column.role_id]
  }
}


table "song_relation" {
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

  column "song_first_id" {
    type = int
  }
  foreign_key "fk_song_relation_song_first_id" {
    columns     = [column.song_first_id]
    ref_columns = [table.song.column.id]
  }

  column "song_second_id" {
    type = int
  }
  foreign_key "fk_song_relation_song_second_id" {
    columns     = [column.song_second_id]
    ref_columns = [table.song.column.id]
  }

  column "relation_type" {
    type = text
  }

  column "description" {
    type = text
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

