use anyhow::Context;
use chrono::NaiveDate;
use entity::enums::DatePrecision;
use entity::event;
use infra_testing::test_connection;
use sea_orm::ActiveValue::Set;
use sea_orm::{ConnectionTrait, EntityTrait};

use crate::find_list_items;

async fn insert_event(
    conn: &impl ConnectionTrait,
    date: Option<NaiveDate>,
) -> anyhow::Result<i32> {
    let event = event::Entity::insert(event::ActiveModel {
        name: Set("Event list fixture".into()),
        short_description: Set(String::new()),
        description: Set(String::new()),
        start_date: Set(date),
        start_date_precision: Set(DatePrecision::Day),
        end_date_precision: Set(DatePrecision::Day),
        ..Default::default()
    })
    .exec(conn)
    .await?;
    Ok(event.last_insert_id)
}

#[tokio::test]
async fn list_filters_selected_events_by_inclusive_start_dates()
-> anyhow::Result<()> {
    let conn = test_connection().await;
    let tx = conn.begin().await?;
    let first = NaiveDate::from_ymd_opt(2025, 1, 1).context("first date")?;
    let last = NaiveDate::from_ymd_opt(2025, 1, 31).context("last date")?;
    let before = insert_event(&tx, first.pred_opt()).await?;
    let at_first = insert_event(&tx, Some(first)).await?;
    let at_last = insert_event(&tx, Some(last)).await?;
    let after = insert_event(&tx, last.succ_opt()).await?;
    let undated = insert_event(&tx, None).await?;
    insert_event(&tx, Some(first)).await?;

    let selected_ids = [before, at_first, at_last, after, undated];
    let events =
        find_list_items(&tx, &selected_ids, Some(first), Some(last)).await?;
    let mut ids: Vec<_> = events.into_iter().map(|event| event.id).collect();
    ids.sort_unstable();

    assert_eq!(ids, [at_first, at_last]);
    tx.rollback().await?;
    Ok(())
}
