table "credit_role" {
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

	column "short_description" {
		type = text
	}

	column "description" {
		type = text
	}
}

table "credit_role_inheritance" {
	schema = schema.public

	column "child_id" {
		type = int
	}
	foreign_key "fk_credit_role_inheritance_child_id" {
		columns = [ column.child_id ]
		ref_columns = [ table.credit_role.column.id ]
		on_update = CASCADE
	}

	column "parent_id" {
		type = int
	}
	foreign_key "fk_credit_role_inheritance_parent_id" {
		columns = [ column.parent_id ]
		ref_columns = [ table.credit_role.column.id ]
		on_update = CASCADE
	}

	primary_key {
		columns = [ column.child_id, column.parent_id ]
	}
}

table "credit_role_history" {
	schema = schema.public

	column "prev_id" {
		type = int
	}
	foreign_key "fk_credit_role_history_prev_id" {
		columns = [ column.prev_id ]
		ref_columns = [ table.credit_role.column.id ]
		on_update = CASCADE
	}

	column "next_id" {
		type = int
	}
	foreign_key "fk_credit_role_history_next_id" {
		columns = [ column.next_id ]
		ref_columns = [ table.credit_role.column.id ]
		on_update = CASCADE
	}

	primary_key {
		columns = [ column.prev_id, column.next_id ]
	}

}
