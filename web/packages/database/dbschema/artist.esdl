module default {
	type Artist extending
		auth::RegularEntity,
		util::WithCreateAndUpdateTime
	{

		required app_id: artist::SeqID {
			constraint exclusive;
			default := std::sequence_next(introspect artist::SeqID);
			readonly := true;
		}

		required name: str;

		localized_name: array<tuple<language: lang::Language, name: str>>;

		required artist_type: artist::ArtistType;

		# date of born/formed and date of died/disbanded
		date_of_start: cal::local_date;
		date_of_start_mask: date::FormatMask;
		date_of_end: cal::local_date;
		date_of_end_mask: date::FormatMask;

		start_location: tuple<country: str, province: str, city: str>;
		current_location: tuple<country: str, province: str, city: str>;
		end_location: tuple<country: str, province: str, city: str>;

		# aliases
		multi alias: Artist {
			constraint exclusive;
			constraint expression on (@target != @source) {
				errmessage := "Alias cannot be itself";
			};
			on target delete allow;
		};
		str_alias: array<std::str>;

		multi members: Artist {
			active_year: multirange<int32>;
			constraint exclusive;
			constraint expression on (@target != @source) {
				errmessage := "Artist can't be members of their own";
			};
			on target delete allow;
		};
		multi member_of := (.<members[is Artist]);

		str_member: array<tuple<name: str, active_year: multirange<int32>>>;

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
