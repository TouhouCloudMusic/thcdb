module default {

	abstract type Artist extending Util::HasCreateAndUpdateTime {
		required name: str;

		artist_type := Artist::getType(Artist);

		required app_id: Artist::id {
			constraint exclusive;
			default := std::sequence_next(introspect Artist::id);
		}

		date_of_start: datetime;
		date_of_end: datetime;

		multi alias: Artist {
			constraint exclusive;
		};
		multi text_alias: str;

		members := [is Artist::Group]._members;
		str_members := [is Artist::Group]._str_members;
		member_of := [is Artist::Person]._member_of;
		str_member_of := [is Artist::Person]._str_member_of;

		multi release := (.<artist[is Release]);
		multi song := (.<artist[is Song]);
	}

}

module Artist {

	scalar type id extending sequence;

	scalar type ArtistType extending enum<
		Person,
		`Group`
	>;

	type Person extending default::Artist {

		overloaded multi alias: Person;

		multi _member_of := (.<_members[is Artist::Group]);
		# multi _member_of2: `Group`;
		multi _str_member_of: str;

	}

	type `Group` extending default::Artist {

		overloaded multi alias: `Group`;

		multi _members: Person {
			join_year: int16;
			leave_year: int16;
			on target delete allow
		};
		multi _str_members: str;
	}

	function getType(x: default::Artist) -> ArtistType {
		volatility := "Stable";
		using (
			if x is Artist::Person then ArtistType.Person else ArtistType.`Group`
		);
	}
}