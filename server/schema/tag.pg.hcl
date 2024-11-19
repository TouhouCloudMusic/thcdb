enum "TagKind" {
	schema = schema.public
	values = [
		"Descriptor",
		"Form",
		"Genre",
		"Scene",
	]
}

table "tag" {
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

  column "kind" {
    type = enum.TagKind
  }

  column "short_description" {
    type = text
  }

  column "description" {
    type = text
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

table "tag_history" {
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

  column "kind" {
    type = enum.TagKind
  }

  column "short_description" {
    type = text
  }

  column "description" {
    type = text
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
