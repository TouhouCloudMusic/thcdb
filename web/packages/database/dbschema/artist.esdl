module default {

	abstract type Artist extending Util::HasCreateAndUpdateTime {
		required name: str;

		artist_type := Artist::getType(Artist);

		required app_id: Artist::seq_id {
			constraint exclusive;
			default := std::sequence_next(introspect Artist::seq_id);
		}

		date_of_start: datetime;
		date_of_end: datetime;

		multi alias: Artist {
			constraint exclusive;
		};
		multi str_alias: str;

		multi release := (.<artist[is Release]);
		multi song := (.<artist[is Song]);
	}

}

module Artist {

	scalar type seq_id extending sequence;

	scalar type ArtistType extending enum<
		Person,
		`Group`
	>;

	type Person extending default::Artist {

		overloaded multi alias: Person;

		multi member_of := (.<members[is Artist::Group]);
		str_member_of: array<tuple<name: str, join_year: str, leave_year: str>>
	}

	type `Group` extending default::Artist {

		overloaded multi alias: `Group`;

		multi members: Person {
			join_year: int16;
			leave_year: int16;
			on target delete allow
		};
		str_members: array<tuple<name: str, join_year: str, leave_year: str>>
	}

	function getType(x: default::Artist) -> ArtistType {
		volatility := "Stable";
		using (
			if x is Artist::Person then ArtistType.Person else ArtistType.`Group`
		);
	}
}