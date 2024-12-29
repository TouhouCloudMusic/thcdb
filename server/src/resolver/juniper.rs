#![allow(clippy::unused_self)]

use entity::GqlScalarValue;

use crate::resolver::release::ReleaseQuery;
use crate::resolver::song::{SongMutation, SongQuery};
use crate::resolver::user::{UserMutation, UserQuery};
use crate::service::juniper::JuniperContext;

pub struct JuniperQuery;
pub struct JuniperMutation;
#[juniper::graphql_object]
#[graphql(context = JuniperContext, scalar = GqlScalarValue)]
impl JuniperQuery {
    const fn user(&self) -> UserQuery {
        UserQuery
    }
    const fn song(&self) -> SongQuery {
        SongQuery
    }
    const fn release(&self) -> ReleaseQuery {
        ReleaseQuery
    }
}

#[juniper::graphql_object]
#[graphql(context = JuniperContext, scalar = GqlScalarValue)]
impl JuniperMutation {
    const fn user(&self) -> UserMutation {
        UserMutation
    }
    const fn song(&self) -> SongMutation {
        SongMutation
    }
}
