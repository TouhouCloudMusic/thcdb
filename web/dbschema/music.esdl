module music {
	scalar type RoleSeqID extending sequence;
	type Role extending
	auth::RegularEntity,
	util::WithCreateAndUpdateTime
	{

		required app_id: RoleSeqID {
			readonly := true;
			constraint exclusive;
			default := std::sequence_next(introspect RoleSeqID);
		}

		required name: str;
		multi alias: tuple<language: lang::Language, name: array<str>> {
			constraint exclusive;
		};

		desc_short: str;
		desc_long: str;

		multi parents: Role;
		chilren := (.<parents[is Role]);
	}

	abstract type Credit {
		required artist: default::Artist {
			on target delete delete source;
		}

		multi role: Role {
			on target delete delete source;
		}
	}

	type Vote {
		required voter: default::User;
		required target: Votable;
		required vote_tier: float32;

		constraint exclusive on ((.voter, .target));
	}

	abstract type Votable {
		multi vote: Vote {
			on target delete allow;
		}
	}

	scalar type DescriptorSeqID extending sequence;
	type Descriptor extending Votable {
		required app_id: DescriptorSeqID {
			readonly := true;
			constraint exclusive;
			default := std::sequence_next(introspect DescriptorSeqID);
		}

		required name: str;
		localized_name: array<tuple<language: lang::Language, name: str>>;

		desc_short: str;
		desc_long: str;

		multi parents: Descriptor {
			inherit_ancestor: bool {
				default := true;
			}
			on target delete allow;
		};
		chilren := (.<parents[is Descriptor]);
	}

	scalar type GenreSeqID extending sequence;
	type Genre extending Votable {
		required app_id: GenreSeqID {
			readonly := true;
			constraint exclusive;
			default := std::sequence_next(introspect GenreSeqID);
		}

		required name: str;
		localized_name: array<tuple<language: lang::Language, name: str>>;

		desc_short: str;
		desc_long: str;

		multi parents: Genre {
			inherit_ancestor: bool {
				default := true;
			}
			on target delete allow;
		};
		chilren := (.<parents[is Genre]);
	}

}
