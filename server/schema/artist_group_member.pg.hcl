table "group_member" {
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

	column "member_id" {
		type = int
	}
	foreign_key "fk_group_member_member_id" {
		columns = [ column.member_id ]
		ref_columns = [ table.artist.column.id ]
	}

	column "group_id" {
		type = int
	}
	foreign_key "fk_group_member_group_id" {
		columns = [ column.group_id ]
		ref_columns = [ table.artist.column.id ]
	}
}

table "group_member_role" {
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

  column "member_id" {
    type = int
  }
  foreign_key "fk_group_member_role_member_id" {
    columns = [ column.member_id ]
    ref_columns = [ table.group_member.column.id ]
  }

  column "role_id" {
    type = int
  }
  foreign_key "fk_group_member_role_role_id" {
    columns = [ column.role_id ]
    ref_columns = [ table.role.column.id ]
  }
}

table "group_member_join_leave" {
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

  column "group_member_id" {
    type = int
  }
  foreign_key "fk_group_member_join_leave_member_id" {
    columns = [ column.group_member_id ]
    ref_columns = [ table.group_member.column.id ]
  }

  column "join_year" {
    type = smallint
    null = true
  }

  column "leave_year" {
    type = smallint
    null = true
  }
}

table "group_member_history" {
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
  foreign_key "fk_artist_group_member_history_history_id" {
    columns = [ column.history_id ]
    ref_columns = [ table.artist_history.column.id ]
  }

  column "artist_id" {
    type = int
  }
  foreign_key "fk_artist_group_member_history_artist_id" {
    columns = [ column.artist_id ]
    ref_columns = [ table.artist.column.id ]
  }
}

table "group_member_role_history" {
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

  column "member_id" {
    type = int
  }
  foreign_key "fk_group_member_role_history_member_id" {
    columns = [ column.member_id ]
    ref_columns = [ table.group_member_history.column.id ]
  }

  column "role_id" {
    type = int
  }
  foreign_key "fk_group_member_role_history_role_id" {
    columns = [ column.role_id ]
    ref_columns = [ table.role.column.id ]
  }
}

table "group_member_join_leave_history" {
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
  foreign_key "fk_group_member_join_leave_history_history_id" {
    columns = [ column.history_id ]
    ref_columns = [ table.group_member_history.column.id ]
  }

  column "join_year" {
    type = text
    null = true
  }

  column "leave_year" {
    type = text
    null = true
  }
}
