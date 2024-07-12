module music {
	type Role extending util::WithCreateAndUpdateTime {
		required name: str;
		desc_short: str;
		desc_long: str;
		parents: Role {
			inherit_ancestor: bool {
				default := true;
			}
		};
		chilren := (.<parents[is Role]);
	}

	abstract type Credit {
		artist: default::Artist;
		role: Role;
	}
}