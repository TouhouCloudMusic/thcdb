use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::email::Mailer;

mod notification_cleanup;
mod password_reset_email;
mod remove_file;
mod unverified_user_cleanup;

pub struct Worker {
    pub redis_pool: fred::prelude::Pool,
    pub repo: SeaOrmRepository,
    pub mailer: Mailer,
    pub notification_retention_days: i64,
}

pub(super) struct WorkerRegistration {
    pub(super) order: u16,
    pub(super) init: fn(&Worker),
}

inventory::collect!(WorkerRegistration);

inventory::submit! {
    WorkerRegistration {
        order: 100,
        init: password_reset_email::init,
    }
}

inventory::submit! {
    WorkerRegistration {
        order: 200,
        init: remove_file::init,
    }
}

inventory::submit! {
    WorkerRegistration {
        order: 300,
        init: notification_cleanup::init,
    }
}

inventory::submit! {
    WorkerRegistration {
        order: 400,
        init: unverified_user_cleanup::init,
    }
}

impl Worker {
    pub fn init(self) {
        let mut registrations = inventory::iter::<WorkerRegistration>
            .into_iter()
            .collect::<Vec<_>>();
        registrations.sort_by_key(|registration| registration.order);

        for registration in registrations {
            (registration.init)(&self);
        }
    }
}
