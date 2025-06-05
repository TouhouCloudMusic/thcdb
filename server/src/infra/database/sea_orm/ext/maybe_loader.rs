use std::collections::{HashMap, HashSet};
use std::str::FromStr;

use sea_orm::{
    Condition, ConnectionTrait, DbErr, DynIden, EntityOrSelect, EntityTrait,
    Identity, ModelTrait, QueryFilter, Related, RelationType, Select,
};
use sea_query::{
    ColumnRef, Expr, IntoColumnRef, SimpleExpr, TableRef, ValueTuple,
};

use super::query_error;

pub trait MaybeLoader {
    type Model: ModelTrait;

    async fn maybe_load_one<R>(
        &self,
        stmt: impl EntityOrSelect<R>,
        db: &impl ConnectionTrait,
    ) -> Result<Vec<Option<R::Model>>, DbErr>
    where
        R: EntityTrait,
        R::Model: Send + Sync,
        <Self::Model as ModelTrait>::Entity: Related<R>;
}

impl<T> MaybeLoader for Vec<Option<T>>
where
    T: ModelTrait + Sync,
{
    type Model = T;

    async fn maybe_load_one<R>(
        &self,
        stmt: impl EntityOrSelect<R>,
        db: &impl ConnectionTrait,
    ) -> Result<Vec<Option<R::Model>>, DbErr>
    where
        R: EntityTrait,
        R::Model: Send + Sync,
        <Self::Model as ModelTrait>::Entity: Related<R>,
    {
        if <<Self::Model as ModelTrait>::Entity as Related<R>>::via().is_some()
        {
            return Err(query_error(
                "Relation is ManytoMany instead of HasOne",
            ));
        }
        let rel_def =
            <<<Self as MaybeLoader>::Model as ModelTrait>::Entity as Related<
                R,
            >>::to();
        if rel_def.rel_type == RelationType::HasMany {
            return Err(query_error("Relation is HasMany instead of HasOne"));
        }

        if self.is_empty() {
            return Ok(Vec::new());
        }

        let keys: Vec<Option<ValueTuple>> = self
            .iter()
            .map(|model| {
                model
                    .as_ref()
                    .map(|model| extract_key(&rel_def.from_col, model))
            })
            .collect();

        let some_keys: Vec<&ValueTuple> = keys
            .iter()
            .filter_map(|x: &Option<ValueTuple>| x.as_ref())
            .collect();

        let condition =
            prepare_condition(&rel_def.to_tbl, &rel_def.to_col, &some_keys);

        let stmt = <Select<R> as QueryFilter>::filter(stmt.select(), condition);

        let data = stmt.all(db).await?;

        let hashmap: HashMap<ValueTuple, <R as EntityTrait>::Model> =
            data.into_iter().fold(
                HashMap::new(),
                |mut acc, value: <R as EntityTrait>::Model| {
                    let key = extract_key(&rel_def.to_col, &value);
                    acc.insert(key, value);

                    acc
                },
            );

        let result: Vec<Option<<R as EntityTrait>::Model>> = keys
            .iter()
            .filter_map(|key| key.as_ref().map(|key| hashmap.get(key).cloned()))
            .collect();

        Ok(result)
    }
}

fn extract_key<Model>(target_col: &Identity, model: &Model) -> ValueTuple
where
    Model: ModelTrait,
{
    match target_col {
        Identity::Unary(a) => {
            let column_a =
                <<Model::Entity as EntityTrait>::Column as FromStr>::from_str(
                    &a.to_string(),
                )
                .unwrap_or_else(|_| {
                    panic!("Failed at mapping string to column A:1")
                });
            ValueTuple::One(model.get(column_a))
        }
        Identity::Binary(a, b) => {
            let column_a =
                <<Model::Entity as EntityTrait>::Column as FromStr>::from_str(
                    &a.to_string(),
                )
                .unwrap_or_else(|_| {
                    panic!("Failed at mapping string to column A:2")
                });
            let column_b =
                <<Model::Entity as EntityTrait>::Column as FromStr>::from_str(
                    &b.to_string(),
                )
                .unwrap_or_else(|_| {
                    panic!("Failed at mapping string to column B:2")
                });
            ValueTuple::Two(model.get(column_a), model.get(column_b))
        }
        Identity::Ternary(a, b, c) => {
            let column_a =
                <<Model::Entity as EntityTrait>::Column as FromStr>::from_str(
                    &a.to_string(),
                )
                .unwrap_or_else(|_| {
                    panic!("Failed at mapping string to column A:3")
                });
            let column_b =
                <<Model::Entity as EntityTrait>::Column as FromStr>::from_str(
                    &b.to_string(),
                )
                .unwrap_or_else(|_| {
                    panic!("Failed at mapping string to column B:3")
                });
            let column_c =
                <<Model::Entity as EntityTrait>::Column as FromStr>::from_str(
                    &c.to_string(),
                )
                .unwrap_or_else(|_| {
                    panic!("Failed at mapping string to column C:3")
                });
            ValueTuple::Three(
                model.get(column_a),
                model.get(column_b),
                model.get(column_c),
            )
        }
        Identity::Many(cols) => {
            let values = cols.iter().map(|col| {
                let col_name = col.to_string();
                let column = <<Model::Entity as EntityTrait>::Column as FromStr>::from_str(
                    &col_name,
                )
                .unwrap_or_else(|_| panic!("Failed at mapping '{col_name}' to column"));
                model.get(column)
            })
            .collect();
            ValueTuple::Many(values)
        }
    }
}

fn prepare_condition(
    table: &TableRef,
    col: &Identity,
    keys: &[&ValueTuple],
) -> Condition {
    let keys = if keys.is_empty() {
        Vec::new()
    } else {
        let set: HashSet<ValueTuple> =
            keys.iter().map(|x| (*x).to_owned()).collect();
        set.into_iter().collect()
    };

    match col {
        Identity::Unary(column_a) => {
            let column_a = table_column(table, column_a);
            Condition::all()
                .add(Expr::col(column_a).is_in(keys.into_iter().flatten()))
        }
        Identity::Binary(column_a, column_b) => Condition::all().add(
            Expr::tuple([
                SimpleExpr::Column(table_column(table, column_a)),
                SimpleExpr::Column(table_column(table, column_b)),
            ])
            .in_tuples(keys),
        ),
        Identity::Ternary(column_a, column_b, column_c) => Condition::all()
            .add(
                Expr::tuple([
                    SimpleExpr::Column(table_column(table, column_a)),
                    SimpleExpr::Column(table_column(table, column_b)),
                    SimpleExpr::Column(table_column(table, column_c)),
                ])
                .in_tuples(keys),
            ),
        Identity::Many(cols) => {
            let columns = cols
                .iter()
                .map(|col| SimpleExpr::Column(table_column(table, col)));
            Condition::all().add(Expr::tuple(columns).in_tuples(keys))
        }
    }
}

fn table_column(tbl: &TableRef, col: &DynIden) -> ColumnRef {
    match tbl.to_owned() {
        TableRef::Table(tbl) => (tbl, col.clone()).into_column_ref(),
        TableRef::SchemaTable(sch, tbl) => {
            (sch, tbl, col.clone()).into_column_ref()
        }
        val => unimplemented!("Unsupported TableRef {val:?}"),
    }
}

impl<T> MaybeLoader for &T
where
    T: MaybeLoader + Sync,
{
    type Model = T::Model;

    async fn maybe_load_one<R>(
        &self,
        stmt: impl EntityOrSelect<R>,
        db: &impl ConnectionTrait,
    ) -> Result<Vec<Option<R::Model>>, DbErr>
    where
        R: EntityTrait,
        R::Model: Send + Sync,
        <Self::Model as ModelTrait>::Entity: Related<R>,
    {
        (*self).maybe_load_one(stmt, db).await
    }
}
