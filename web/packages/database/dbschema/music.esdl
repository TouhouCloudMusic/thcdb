module Music {
	type Role extending Util::HasCreateAndUpdateTime {
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