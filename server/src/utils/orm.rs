use sea_orm::{ConnectionTrait, EntityTrait, IntoActiveModel};

mod pg_func_ext;

pub trait InsertMany<T: EntityTrait> {
    type Entity: EntityTrait;
    async fn insert_many(
        self,
        db: &impl ConnectionTrait,
    ) -> Result<Vec<<Self::Entity as EntityTrait>::Model>, sea_orm::DbErr>
    where
        <Self::Entity as EntityTrait>::Model:
            IntoActiveModel<<Self::Entity as EntityTrait>::ActiveModel>;

    async fn insert_many_without_returning(
        self,
        db: &impl ConnectionTrait,
    ) -> Result<(), sea_orm::DbErr>
    where
        <Self::Entity as EntityTrait>::Model:
            IntoActiveModel<<Self::Entity as EntityTrait>::ActiveModel>;
}

macro_rules! impl_insert_many {
    ( $($path:ident),* $(,)?) => {
        $(
            impl<I> InsertMany<entity::$path::Entity> for I
            where
                I: IntoIterator<Item = entity::$path::ActiveModel>,
            {
                type Entity = entity::$path::Entity;
                async fn insert_many(
                    self,
                    db: &impl ConnectionTrait,
                ) -> Result<Vec<<Self::Entity as EntityTrait>::Model>, sea_orm::DbErr>
                where
                    <Self::Entity as EntityTrait>::Model:
                        IntoActiveModel<<Self::Entity as EntityTrait>::ActiveModel>,
                {
                    Self::Entity::insert_many(self)
                        .exec_with_returning_many(db)
                        .await
                }

                async fn insert_many_without_returning(
                    self,
                    db: &impl ConnectionTrait,
                ) -> Result<(), sea_orm::DbErr>
                where
                    <Self::Entity as EntityTrait>::Model:
                        IntoActiveModel<<Self::Entity as EntityTrait>::ActiveModel>,
                {
                    Self::Entity::insert_many(self)
                        .exec_without_returning(db)
                        .await?;
                    Ok(())
                }
            }
        )*
    };
}

impl_insert_many! {
    event_alternative_name,
    event_alternative_name_history,
    release_artist,
    release_artist_history,
    release_catalog_number,
    release_catalog_number_history,
    release_credit,
    release_credit_history,
    release_event,
    release_event_history,
    release_localized_title,
    release_localized_title_history,
    release_track,
    release_track_history,
    song,
    song_history,
    song_artist,
    song_artist_history,
}

// use sea_orm::sea_query::{Alias, IntoIden, SelectExpr, SelectStatement};
// use sea_orm::{ColumnTrait, EntityTrait, Iden, QueryTrait};

// // From https://github.com/SeaQL/sea-orm/discussions/1502

// fn add_columns_with_prefix<
//     S: QueryTrait<QueryStatement = SelectStatement>,
//     T: EntityTrait,
// >(
//     selector: &mut S,
//     prefix: &'static str,
// ) {
//     for col in <T::Column as sea_orm::entity::Iterable>::iter() {
//         let alias = format!("{}{}", prefix, col.to_string());
//         selector.query().expr(SelectExpr {
//             expr: col.select_as(col.into_expr()),
//             alias: Some(Alias::new(&alias).into_iden()),
//             window: None,
//         });
//     }
// }

// pub struct Prefixer<S: QueryTrait<QueryStatement = SelectStatement>> {
//     pub selector: S,
// }

// impl<S: QueryTrait<QueryStatement = SelectStatement>> Prefixer<S> {
//     pub const fn new(selector: S) -> Self {
//         Self { selector }
//     }
//     pub fn add_columns<T: EntityTrait>(mut self, entity: T) -> Self {
//         for col in <T::Column as sea_orm::entity::Iterable>::iter() {
//             let alias = format!("{}{}", entity.table_name(), col.to_string()); // we use entity.table_name() as prefix
//             self.selector.query().expr(SelectExpr {
//                 expr: col.select_as(col.into_expr()),
//                 alias: Some(Alias::new(&alias).into_iden()),
//                 window: None,
//             });
//         }
//         self
//     }
// }
