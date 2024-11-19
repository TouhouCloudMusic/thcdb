schema "public" {
  comment = "standard public schema"
}

enum "DatePrecision" {
  schema = schema.public
  values = [ "Day", "Month", "Year" ]
}
