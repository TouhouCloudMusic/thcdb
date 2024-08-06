using extension auth;

module auth {
	abstract type RegularEntity {
		access policy full_access
		allow all
		using (global default::current_user.role ?= user::Role.Admin);
		access policy read_write
		allow select, insert, update
		using (global default::current_user.role ?= user::Role.Regular);
		access policy read_only
		allow select
	 }
}
