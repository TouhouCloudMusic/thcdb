module default {

	type Song {
		required title: str;
		required multi artist: Artist;
		duration: duration;
		language: lang::Language;
	}

}