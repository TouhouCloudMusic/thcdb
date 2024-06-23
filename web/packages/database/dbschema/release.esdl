module default {
	type Release extending Util::HasCreateAndUpdateTime {
		required title: str;
		required type: Release::Type {
			default := Release::Type.Album
		};
		catalog_num: str {
			constraint max_len_value(32);
		};
		credit_name: str;


		release_date: datetime;
		release_date_visibility: Util::Date::Visibility {
			default := Util::Date::Visibility.Full;
		}

		total_disc: int16;
		multi language: Util::Language;

		required multi artist: Artist {
			constraint exclusive;
			credit_name: str;
			separator: str;
		};
	}
}

module Release {
	scalar type id extending sequence;

	scalar type `Type` extending enum<
		Album,
		EP,
		`Single`
	>;

	type Tracklist {
		required order: int16;
		track_num: str;

		credit: TrackCredit {
			constraint exclusive;
		}

		artist: default::Artist;
		release: default::Release {
			constraint exclusive;
		};
		song: default::Song {
			constraint exclusive;
		};
	}

	type TrackCredit extending Music::Credit {
		track := (.<credit[is Tracklist]);
	}
}