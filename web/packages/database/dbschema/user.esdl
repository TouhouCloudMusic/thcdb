module default {
	global current_user := (
    assert_single((
      select User
      filter .identity = global ext::auth::ClientTokenIdentity
    ))
  );

	type User extending util::WithCreateAndUpdateTime {
		required identity: ext::auth::Identity {
      constraint exclusive;
    }

		required name: str;
		email: str {
			constraint exclusive
		}

		role: user::Role {
			default := user::Role.Regular;
		}
	}
}

module user {
	scalar type Role extending enum<
		Admin,
		Regular,
	>;
}