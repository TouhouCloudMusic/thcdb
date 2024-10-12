module default {
	type Release extending
		auth::RegularEntity,
		user::CustomTaggable,
		util::WithCreateAndUpdateTime
	{

		required app_id: release::SeqID {
			constraint exclusive;
			default := std::sequence_next(introspect release::SeqID);
			readonly := true;
		}

		# Title
		required title: str;
		index pg::spgist on (.title);
		localized_title: array<tuple<language: lang::Language, title: str>>;

		# Type
		required type: release::Type;

		# Release and Recording Date
		release_date: cal::local_date;
		release_date_mask: date::FormatMask {
			default := date::FormatMask.Full;
		}

		recording_date_start: cal::local_date;
		recording_date_start_mask: date::FormatMask {
			default := date::FormatMask.Full;
		}
		recording_date_end: cal::local_date;
		recording_date_end_mask: date::FormatMask {
			default := date::FormatMask.Full;
		}

		multi track: release::Track;

		# Other Info
		catalog_num: str;
		total_disc: int16;
		multi language: lang::Language;

		# Links
		## Credit Artists
		credit_name: str;
		required multi artist: Artist {
			constraint exclusive;
			credit_name: str;
			separator: str;
			on target delete allow;
		}

		## Labels
		multi label: Label {
			constraint exclusive;
			on target delete allow;
		}
	}
}

module release {
	scalar type SeqID extending sequence;

	scalar type `Type` extending enum<
		Album,
		EP,
		`Single`
	>;

	type Track {
		required order: int16;

		track_num: str;

		multi credit: TrackCredit {
			constraint exclusive;
			on target delete allow;
		}

		release := (.<track[is default::Release]);

		multi artist: default::Artist {
			constraint exclusive;
			on target delete allow;
		};

		required song: default::Song {
			constraint exclusive;
			on target delete allow;
		};
	}

	type TrackCredit extending music::Credit {
		track := (.<credit[is Track]);
	}
}
