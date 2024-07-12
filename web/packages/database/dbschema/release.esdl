module default {

	type Release extending util::WithCreateAndUpdateTime {
		required title: str;
		required type: release::Type {
			default := release::Type.Album
		};
		catalog_num: str {
			constraint max_len_value(32);
		};
		credit_name: str;


		release_date: datetime;
		release_date_visibility: date::Visibility {
			default := date::Visibility.Full;
		}

		total_disc: int16;
		multi language: lang::Language;

		required multi artist: Artist {
			constraint exclusive;
			credit_name: str;
			separator: str;
		};
	}

}

module release {
	scalar type seq_id extending sequence;

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

	type TrackCredit extending music::Credit {
		track := (.<credit[is Tracklist]);
	}
}