use entity::language;
use itertools::Itertools;
use sea_orm::ActiveValue::Set;
use sea_orm::{ConnectionTrait, DbErr, EntityTrait, QueryOrder};
use serde::Deserialize;

#[derive(Deserialize)]
struct Lang {
    name: String,
    code: String,
}

pub async fn upsert_langauge(db: &impl ConnectionTrait) -> Result<(), DbErr> {
    let json = include_str!("iso-639-3.json");
    let data = serde_json::from_str::<Vec<Lang>>(json)
        .unwrap()
        .into_iter()
        .enumerate()
        .collect_vec();

    let models = language::Entity::find()
        .order_by_asc(language::Column::Id)
        .all(db)
        .await?;

    for model in &models {
        let Lang { name, code } = &data[usize::try_from(model.id).unwrap()].1;
        assert!(
            model.code == *code && model.name == *name,
            r"
                Language mismatch
                id: {}
                name in database: {name}
                name in definition: {}
                code in database: {code}
                code in definition: {}
                ",
            model.id,
            model.name,
            model.code
        );
    }

    language::Entity::insert_many(data.into_iter().map(
        |(idx, Lang { name, code })| language::ActiveModel {
            id: Set(idx.try_into().unwrap()),
            name: Set(name),
            code: Set(code),
        },
    ))
    .on_conflict_do_nothing()
    .exec(db)
    .await?;

    Ok(())
}
