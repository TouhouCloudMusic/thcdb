use std::collections::BTreeSet;

use infra_db::SeaOrmRepository;

use super::{Error, repo};
use crate::features::auth::{EditableUserRole, UserRole, UserRoleEnum};
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::EntityNotFound;

pub(super) struct Service {
    pub(super) repo: SeaOrmRepository,
    pub(super) user_events: UserEventSender,
}

impl Service {
    pub(super) async fn set_user_roles(
        &self,
        actor_id: i32,
        target_id: i32,
        roles: &BTreeSet<EditableUserRole>,
    ) -> Result<Vec<UserRole>, Error> {
        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .db_operation("begin set user roles transaction")?;

        if !repo::lock_user(tx_repo.conn(), target_id).await? {
            return Err(EntityNotFound::new("user", target_id).into());
        }

        let old_roles = repo::load_user_roles(tx_repo.conn(), target_id)
            .await?
            .into_iter()
            .map(|role| UserRole::try_from(role).map(UserRoleEnum::from))
            .collect::<Result<BTreeSet<_>, _>>()?;

        let new_roles = old_roles
            .iter()
            .copied()
            .filter(|role| !role.is_editable())
            .chain(roles.iter().copied().map(UserRoleEnum::from))
            .collect::<BTreeSet<_>>();

        if old_roles == new_roles {
            tx_repo.commit().await.map_err(DatabaseError::from)?;
            return Ok(old_roles.into_iter().map(UserRole::from).collect());
        }

        repo::replace_editable_user_roles(tx_repo.conn(), target_id, roles)
            .await?;

        let notification_recipients =
            account_notification::create_role_changed_notification(
                tx_repo.conn(),
                actor_id,
                target_id,
                new_roles
                    .iter()
                    .copied()
                    .map(i32::from)
                    .collect::<BTreeSet<_>>(),
            )
            .await?;

        tx_repo.commit().await.map_err(DatabaseError::from)?;
        self.user_events.publish(
            UserEvent::NotificationInboxUpdated,
            notification_recipients.user_ids,
        );
        self.user_events
            .publish_to_user(UserEvent::AuthorizationUpdated, target_id);

        Ok(new_roles.into_iter().map(UserRole::from).collect())
    }
}
