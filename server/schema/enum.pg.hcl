enum "AlternativeNameType" {
  schema = schema.public
  values = ["Alias", "Localization"]
}

enum "DatePrecision" {
  schema = schema.public
  values = ["Day", "Month", "Year"]
}


enum "EntityType" {
  schema = schema.public
  values = [
    "Artist",
    "Label",
    "Release",
    "Song",
    "Tag",
    "Event",
  ]
}
