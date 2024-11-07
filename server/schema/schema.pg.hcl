schema "public" {
  comment = "standard public schema"
}


enum "DatePrecision" {
  schema = schema.public
  values = [ "Day", "Month", "Year" ]
}

enum "EntityStatus" {
  schema = schema.public
  values = [ "Pending", "Accepted", "Rejected", "Archived" ]
}
