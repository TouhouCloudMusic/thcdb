module default {
	type Song extending
		auth::RegularEntity,
		user::CustomTaggable,
		util::WithCreateAndUpdateTime
	{
			required app_id: release::SeqID {
			constraint exclusive;
			default := std::sequence_next(introspect song::SeqID);
		}

		required title: str;
		index pg::spgist on (.title);

		localized_title: array<tuple<language: lang::Language, title: str>>;

		required multi artist: Artist {
			constraint exclusive;
			on target delete allow;
		}

		multi track := (.<song[is release::Track]);

		duration: duration;
		language: lang::Language;
	}
}

module song {
	scalar type SeqID extending sequence;
}
