module default {

	type Artist {
		required name: str;
	}

	type Release {
		required title: str;
		multi artist: Artist;
	}
}
