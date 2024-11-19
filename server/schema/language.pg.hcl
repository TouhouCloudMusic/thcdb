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

	column "name" {
		type = text
	}
	index "idx_language_name" {
    columns = [ column.name ]
    unique = true
	}

}
