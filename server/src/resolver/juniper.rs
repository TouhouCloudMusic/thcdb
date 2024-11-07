use crate::resolver::release::ReleaseQuery;
use crate::resolver::song::{SongMutation, SongQuery};
use crate::resolver::user::{UserMutation, UserQuery};
use crate::service::juniper::JuniperContext;

pub struct JuniperQuery;
pub struct JuniperMutation;
#[juniper::graphql_object]
#[graphql(context = JuniperContext)]
impl JuniperQuery {
    fn user(&self) -> UserQuery {
        UserQuery
    }
    fn song(&self) -> SongQuery {
        SongQuery
    }
    fn release(&self) -> ReleaseQuery {
        ReleaseQuery
    }
}

#[juniper::graphql_object]
#[graphql(context = JuniperContext)]
impl JuniperMutation {
    fn user(&self) -> UserMutation {
        UserMutation
    }
    fn song(&self) -> SongMutation {
        SongMutation
    }
}
