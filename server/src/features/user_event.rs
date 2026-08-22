use std::convert::Infallible;
use std::time::Duration;

use async_stream::stream;
use axum::extract::State;
use axum::response::Sse;
use axum::response::sse::{Event, KeepAlive};
use futures_util::Stream;
use sorted_vec::SortedSet;
use tokio::sync::broadcast;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum UserEvent {
    NotificationInboxUpdated,
    AuthorizationUpdated,
}

impl UserEvent {
    const fn name(self) -> &'static str {
        match self {
            Self::NotificationInboxUpdated => "notification-inbox-updated",
            Self::AuthorizationUpdated => "authorization-updated",
        }
    }
}

#[derive(Clone)]
pub(crate) struct UserEventSender {
    sender: broadcast::Sender<UserEventMessage>,
}

#[derive(Clone)]
pub(crate) struct UserEventMessage {
    pub(crate) event: UserEvent,
    users: SortedSet<i32>,
}

impl UserEventMessage {
    pub(crate) fn is_for(&self, user_id: i32) -> bool {
        self.users.binary_search(&user_id).is_ok()
    }
}

impl UserEventSender {
    pub(crate) fn new(channel_capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(channel_capacity);
        Self { sender }
    }

    pub(crate) fn subscribe(&self) -> broadcast::Receiver<UserEventMessage> {
        self.sender.subscribe()
    }

    pub(crate) fn publish(
        &self,
        event: UserEvent,
        recipient_user_ids: SortedSet<i32>,
    ) {
        if recipient_user_ids.is_empty() {
            return;
        }

        let _ = self.sender.send(UserEventMessage {
            event,
            users: recipient_user_ids,
        });
    }

    pub(crate) fn publish_to_user(&self, event: UserEvent, user_id: i32) {
        self.publish(event, vec![user_id].into());
    }
}

pub(crate) fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|router| router.routes(routes!(stream_user_events)))
        .finish()
}

fn sse_event(event: UserEvent) -> Event {
    Event::default().event(event.name()).data("{}")
}

#[utoipa::path(
    get,
    tag = "User",
    path = "/user-events/stream",
    responses(
        (status = 200, body = String, content_type = "text/event-stream"),
    ),
)]
async fn stream_user_events(
    CurrentUser(user): CurrentUser,
    State(state): State<ArcAppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let mut receiver = state.user_events.subscribe();

    Sse::new(stream! {
        yield Ok(sse_event(UserEvent::NotificationInboxUpdated));
        yield Ok(sse_event(UserEvent::AuthorizationUpdated));

        loop {
            match receiver.recv().await {
                Ok(message) if message.is_for(user.id) => {
                    yield Ok(sse_event(message.event));
                }
                Ok(_) => {}
                Err(broadcast::error::RecvError::Lagged(_)) => {
                    yield Ok(sse_event(UserEvent::NotificationInboxUpdated));
                    yield Ok(sse_event(UserEvent::AuthorizationUpdated));
                }
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    })
    .keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
}
