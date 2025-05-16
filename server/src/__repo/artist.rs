#[cfg(test)]
mod test {

    // #[tokio::test]
    // async fn get_artist_membership_from_artist_history_exec() -> Result<(), DbErr> {
    //     // TODO: Test env and test database
    //     dotenvy::dotenv().ok();
    //     let config = crate::infrastructure::config::Config::init();
    //     let client = get_connection(&config.database_url).await;

    //     let res = client
    //         .query_one(Statement::from_sql_and_values(
    //             DbBackend::Postgres,
    //             &*GET_artist_membership_FROM_ARTIST_HISTORY_BY_ID_SQL,
    //             [1.into()],
    //         ))
    //         .await
    //         .expect("Error while query");

    //     println!("Query result: {res:?}");

    //     if let Some(result) = res {
    //         let pr = GroupMemberFromHistory::from_query_result(&result, "")
    //             .map_err(|e| {
    //                 eprint!("{e:?}");

    //                 e
    //             });
    //         println!("Parsed result: {pr:?}");
    //     }

    //     Ok(())
    // }
}
