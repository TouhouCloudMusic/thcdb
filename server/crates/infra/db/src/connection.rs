use std::future::Future;
use std::pin::Pin;
use std::time::Instant;

use fastrace::future::FutureExt;
use futures_util::FutureExt as _;
use infra_observability::database::record_query_result;
use infra_observability::span::trace;
use sea_orm::{
    AccessMode, ConnectionTrait, DbBackend, DbErr, ExecResult, IsolationLevel,
    QueryResult, Statement, TransactionTrait,
};

#[cfg(test)]
mod tests;

macro_rules! query_operations {
    ($($operation:ident => $label:literal),+ $(,)?) => {
        enum QueryOperation {
            $($operation),+
        }

        impl QueryOperation {
            const fn span_name(&self) -> &'static str {
                match self {
                    $(Self::$operation => concat!("db.query.", $label)),+
                }
            }

            const fn operation_label(&self) -> &'static str {
                match self {
                    $(Self::$operation => $label),+
                }
            }
        }
    };
}

query_operations! {
    Execute => "execute",
    ExecuteUnprepared => "execute_unprepared",
    QueryOne => "query_one",
    QueryAll => "query_all",
}

async fn query<T>(
    operation: QueryOperation,
    query: impl Future<Output = Result<T, DbErr>> + Send,
) -> Result<T, DbErr> {
    let operation_label = operation.operation_label();
    let started = Instant::now();
    let span = fastrace::Span::enter_with_local_parent(operation.span_name())
        .with_properties(|| {
            [
                ("span.kind", "client"),
                ("db.system.name", "postgresql"),
                ("db.operation.name", operation_label),
            ]
        });

    query
        .inspect(|result| {
            let elapsed = started.elapsed();
            record_query_result(operation_label, result, elapsed);
        })
        .in_span(span)
        .await
}

#[derive(Clone, Debug)]
pub struct ObservedConnection<C> {
    pub(super) inner: C,
}

impl<C> From<C> for ObservedConnection<C> {
    fn from(inner: C) -> Self {
        Self { inner }
    }
}

pub type DatabaseConnection = ObservedConnection<sea_orm::DatabaseConnection>;
pub type DatabaseTransaction = ObservedConnection<sea_orm::DatabaseTransaction>;

impl<C: TransactionTrait + Sync> ObservedConnection<C> {
    pub async fn begin(&self) -> Result<DatabaseTransaction, DbErr> {
        trace("db.transaction.begin", self.inner.begin())
            .await
            .map(Into::into)
    }

    pub async fn begin_with_config(
        &self,
        isolation_level: Option<IsolationLevel>,
        access_mode: Option<AccessMode>,
    ) -> Result<DatabaseTransaction, DbErr> {
        trace(
            "db.transaction.begin",
            self.inner.begin_with_config(isolation_level, access_mode),
        )
        .await
        .map(Into::into)
    }
}

impl DatabaseConnection {
    pub async fn close(self) -> Result<(), DbErr> {
        self.inner.close().await
    }
}

impl DatabaseTransaction {
    pub async fn commit(self) -> Result<(), DbErr> {
        trace("db.transaction.commit", self.inner.commit()).await
    }

    pub async fn rollback(self) -> Result<(), DbErr> {
        trace("db.transaction.rollback", self.inner.rollback()).await
    }
}

impl<C: ConnectionTrait> ConnectionTrait for ObservedConnection<C> {
    fn get_database_backend(&self) -> DbBackend {
        self.inner.get_database_backend()
    }

    fn support_returning(&self) -> bool {
        self.inner.support_returning()
    }

    fn is_mock_connection(&self) -> bool {
        self.inner.is_mock_connection()
    }

    fn execute<'a, 'f>(
        &'a self,
        stmt: Statement,
    ) -> Pin<Box<dyn Future<Output = Result<ExecResult, DbErr>> + Send + 'f>>
    where
        'a: 'f,
        Self: 'f,
    {
        Box::pin(query(QueryOperation::Execute, self.inner.execute(stmt)))
    }

    fn execute_unprepared<'a, 'b, 'f>(
        &'a self,
        sql: &'b str,
    ) -> Pin<Box<dyn Future<Output = Result<ExecResult, DbErr>> + Send + 'f>>
    where
        'a: 'f,
        'b: 'f,
        Self: 'f,
    {
        Box::pin(query(
            QueryOperation::ExecuteUnprepared,
            self.inner.execute_unprepared(sql),
        ))
    }

    fn query_one<'a, 'f>(
        &'a self,
        stmt: Statement,
    ) -> Pin<
        Box<
            dyn Future<Output = Result<Option<QueryResult>, DbErr>> + Send + 'f,
        >,
    >
    where
        'a: 'f,
        Self: 'f,
    {
        Box::pin(query(QueryOperation::QueryOne, self.inner.query_one(stmt)))
    }

    fn query_all<'a, 'f>(
        &'a self,
        stmt: Statement,
    ) -> Pin<
        Box<dyn Future<Output = Result<Vec<QueryResult>, DbErr>> + Send + 'f>,
    >
    where
        'a: 'f,
        Self: 'f,
    {
        Box::pin(query(QueryOperation::QueryAll, self.inner.query_all(stmt)))
    }
}
