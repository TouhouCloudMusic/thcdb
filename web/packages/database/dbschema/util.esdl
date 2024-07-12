module util {

	abstract type WithCreateTime {
		created_at: datetime {
			rewrite insert using (datetime_of_statement());
			readonly := true;
		}
	};

	abstract type WithUpdateTime {
		updated_at: datetime {
			rewrite insert, update using (datetime_of_statement());
		}
	};

	abstract type WithCreateAndUpdateTime extending WithCreateTime, WithUpdateTime {};

}

module date {

	scalar type Visibility extending enum<
		Y,
		YM,
		Full,
	>;

}

module lang {

	scalar type Language extending enum<
		English,
		Chinese,
		Japanese
	>;

}