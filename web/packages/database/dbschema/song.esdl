module default {
	type Song extending util::WithCreateAndUpdateTime, auth::RegularEntity {
		required title: str;
		required multi artist: Artist;
		duration: duration;
		language: lang::Language;
	}
}
