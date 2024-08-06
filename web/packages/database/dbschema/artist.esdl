module default {
	type Artist extending
		auth::RegularEntity,
		util::WithCreateAndUpdateTime {
		required name: str;
		index pg::spgist on (.name);

		required artist_type: artist::ArtistType;

		required app_id: artist::SeqID {
			constraint exclusive;
			default := std::sequence_next(introspect artist::SeqID);
		}

		date_of_start: datetime;
		date_of_end: datetime;

		multi alias: Artist {
			constraint exclusive;
		};
		str_alias: array<std::str>;

		multi member_of := (.<members[is default::Artist]);
		multi members: Artist {
			join_year: int16;
			leave_year: int16;
			on target delete allow
		};
		str_member: array<tuple<name: str, join_year: str, leave_year: str>>;

		multi release := (.<artist[is Release]);
		multi song := (.<artist[is Song]);
	}
}

module artist {
	scalar type SeqID extending sequence;

	scalar type ArtistType extending enum<
		Person,
		`Group`
	>;
}
