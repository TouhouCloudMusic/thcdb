table "language" {
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

  column "code" {
    type = text
    comment = "Language code of ISO 639-3"
  }
  index "idx_language_code" {
    columns = [ column.code ]
    unique = true
  }

	column "name" {
		type = text
	}
	index "idx_language_name" {
    columns = [ column.name ]
    unique = true
	}

}
