env "local" {
	url = getenv("DATABASE_URL")
	dev = getenv("ATLAS_DEV_DATABASE_URL")

	exclude = ["*.seaql_migrations"]
	schema {
		src = "file://schema/"
	}
}

env "docker" {
	exclude = ["*.seaql_migrations"]
	schema {
		src = "file://schema/"
	}
}
