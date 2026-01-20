use std::sync::Arc;
use std::time::{Duration, Instant};

use dashmap::DashMap;
use dashmap::mapref::entry::Entry;
use tokio::sync::broadcast;

#[derive(Clone)]
pub struct NotificationHub {
    channels: Arc<DashMap<i32, ChannelEntry>>,
}

impl NotificationHub {
    const CHANNEL_CAPACITY: usize = 64;
    const CHANNEL_TTL: Duration = Duration::from_hours(1);
    const CLEANUP_INTERVAL: Duration = Duration::from_mins(1);

    pub fn new() -> Self {
        let hub = Self {
            channels: Arc::new(DashMap::new()),
        };

        hub.spawn_cleanup_task();

        hub
    }

    pub fn subscribe(
        &self,
        user_id: i32,
    ) -> (broadcast::Receiver<String>, SubscriptionGuard) {
        let now = Instant::now();
        let sender = match self.channels.entry(user_id) {
            Entry::Occupied(mut occupied) => {
                let entry = occupied.get_mut();
                entry.subscriber_count =
                    entry.subscriber_count.saturating_add(1);
                entry.last_empty_at = None;
                entry.sender.clone()
            }
            Entry::Vacant(vacant) => {
                let mut entry = ChannelEntry::new(now);
                entry.subscriber_count = 1;
                entry.last_empty_at = None;
                let sender = entry.sender.clone();
                vacant.insert(entry);
                sender
            }
        };

        let rx = sender.subscribe();
        let guard = SubscriptionGuard {
            user_id,
            hub: self.clone(),
        };

        (rx, guard)
    }

    pub fn publish(&self, user_id: i32, msg: String) {
        let sender = self
            .channels
            .get(&user_id)
            .map(|entry| entry.sender.clone());

        let Some(sender) = sender else {
            // No active subscribers; don't keep channels around just for "offline push".
            return;
        };

        let _ = sender.send(msg);
    }

    fn unsubscribe(&self, user_id: i32) {
        let Some(mut entry) = self.channels.get_mut(&user_id) else {
            return;
        };

        entry.subscriber_count = entry.subscriber_count.saturating_sub(1);
        if entry.subscriber_count == 0 {
            entry.last_empty_at = Some(Instant::now());
        }
    }

    fn spawn_cleanup_task(&self) {
        let channels = Arc::clone(&self.channels);
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Self::CLEANUP_INTERVAL).await;

                let now = Instant::now();
                let to_remove = channels.iter().filter_map(|entry| {
                    if entry.subscriber_count > 0 {
                        return None;
                    }
                    let empty_at = entry.last_empty_at?;
                    if now.duration_since(empty_at) >= Self::CHANNEL_TTL {
                        Some(*entry.key())
                    } else {
                        None
                    }
                });

                for user_id in to_remove {
                    let _ = channels.remove_if(&user_id, |_, entry| {
                        entry.subscriber_count == 0
                            && entry.last_empty_at.is_some_and(|t| {
                                now.duration_since(t) >= Self::CHANNEL_TTL
                            })
                    });
                }
            }
        });
    }
}

struct ChannelEntry {
    sender: broadcast::Sender<String>,
    subscriber_count: usize,
    last_empty_at: Option<Instant>,
}

impl ChannelEntry {
    fn new(now: Instant) -> Self {
        let (tx, _rx) = broadcast::channel(NotificationHub::CHANNEL_CAPACITY);
        Self {
            sender: tx,
            subscriber_count: 0,
            last_empty_at: Some(now),
        }
    }
}

pub struct SubscriptionGuard {
    user_id: i32,
    hub: NotificationHub,
}

impl Drop for SubscriptionGuard {
    fn drop(&mut self) {
        self.hub.unsubscribe(self.user_id);
    }
}
