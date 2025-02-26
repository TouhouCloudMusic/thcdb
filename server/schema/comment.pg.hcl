enum "CommentTarget" {
	schema = schema.public
	values = [
		"Correction"
	]
}

enum "CommentState" {
	schema = schema.public
	values = [
		"Visable",
		"InReview",
		"Hidden",
		"Deleted"
	]
}

table "comment" {
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

	column "content" {
		type = text
	}

	column "state" {
		type = enum.CommentState
	}

	column "author_id" {
		type = int
	}
	foreign_key "fk_comment_author_id" {
		columns     = [column.author_id]
		ref_columns = [table.user.column.id]
	}

	column "target" {
		type = enum.CommentTarget
	}

	column "target_id" {
		type = int
	}

	column "parent_id" {
		type = int
		null = true
	}
	foreign_key "fk_comment_parent_id" {
		columns = [ column.parent_id ]
		ref_columns = [ table.comment.column.id ]
	}

	column "created_at" {
		type = timestamptz
	}

	column "updated_at" {
		type = timestamptz
	}
}

table "comment_revision" {
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

	column "comment_id" {
		type = int
	}
	foreign_key "fk_comment_content_comment_id" {
		columns     = [column.comment_id]
		ref_columns = [table.comment.column.id]
	}

	column "content" {
		type = text
	}

	column "created_at" {
		type = timestamptz
	}
}
