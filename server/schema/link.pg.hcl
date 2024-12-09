enum "MediaPlatform" {
  schema = schema.public
  values = [
    "Bluesky",
    "Weibo",
    "X",
  ]
}

table "link" {
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

  column "platform" {
    type = enum.MediaPlatform
  }

  column "url" {
    type = text
  }
  unique "unique_link_url" {
    columns = [column.url]
  }
}
