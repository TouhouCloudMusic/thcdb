module Util {

	scalar type Language extending enum<
		English,
		Chinese,
		Japanese
	>;

	abstract type HasCreateTime {
		create_at: datetime {
			rewrite insert using (datetime_of_statement());
			readonly := true;
		}
	};

	abstract type HasUpdateTime {
		update_at: datetime {
			rewrite insert, update using (datetime_of_statement());
		}
	};

	abstract type HasCreateAndUpdateTime extending HasCreateTime, HasUpdateTime {};

}

module Util::Date {

	scalar type Visibility extending enum<
		Y,
		YM,
		Full,
	>;

	# function getCurrentYear() -> int16 {
	# 	volatility := "Volatile";
	# 	using (
	# 		select <int16>datetime_get(datetime_current(), "year")
	# 	)
	# }
}