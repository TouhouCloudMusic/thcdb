use sea_orm::ActiveModelTrait;

pub trait IntoManyActiveModel<T>
where
    T: ActiveModelTrait,
{
    fn into_many_active_model(self) -> impl Iterator<Item = T>;
}
