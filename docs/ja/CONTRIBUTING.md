# Touhou Cloud DB 開発ガイド

<h2 style="text-align: left;">
    <a href="../en_US/CONTRIBUTING.md">English</a> |
    <a href="../zh_CN/CONTRIBUTING.md">中文</a> |
    <a href="../ja/CONTRIBUTING.md">日本語</a>
</h2>

## 目次

- [開発](#development)
- [Commit 規約](#commit-convention)

## <a id="development"></a>開発

### Docker で開発環境を実行（推奨）

リポジトリのルートで実行してください：

```bash
# 必要に応じて env を更新
cp .env.example .env
just dev
```

デフォルトのアクセス先：

- フロントエンド：`http://127.0.0.1:3000`
- バックエンド：`http://127.0.0.1:12345`

サービスを停止：

```bash
just down
```

### ローカルで個別に実行

#### フロントエンド

パッケージ管理には pnpm を使用します。

フロントエンドをローカルで直接実行したい場合は、`web/.env` に以下を追加することを推奨します：

```bash
# web/.env
VITE_SERVER_URL=http://127.0.0.1:12345
```

`web/.env.example` をそのままコピーして開始することもできます。

#### バックエンド

##### 前提条件

- rust
- [Just](https://github.com/casey/just) Task runner
- [Taplo](https://taplo.tamasfe.dev/) Toml formatter
- sea-orm-cli
- PostgreSQL
- Redis

##### 設定

バックエンドをローカルで直接実行したい場合、次の環境変数を設定する必要があります：

- `DATABASE_URL`（必須）：データベース接続文字列。例：`postgres://username:password@localhost:5432/database_name`
- `REDIS_URL`（必須）：Redis 接続アドレス。例：`redis://username:password@localhost:6379`
- `ADMIN_PASSWORD`（必須）：開発用管理者アカウントのパスワード（バックエンド起動時に管理者アカウントの初期化/更新に使用）

##### 設定ファイルと環境変数の上書きルール

バックエンド設定は `server/config.toml` から読み込まれ、環境変数で上書きできます。

- トップレベルのフィールドは同名の変数を直接使用します（例：`DATABASE_URL`、`REDIS_URL`）。
- ネストしたフィールドは階層を `::` で区切ります（例：`middleware::limit::req_per_sec`、`app::port`）。

現行コードでの優先順位：

1. `config.toml`
2. 環境変数
3. `config.dev.toml`（`debug` ビルド時のみ、かつファイルが存在する場合）

### <a id="commit-convention"></a>Commit 規約

命令形で、先頭を大文字にしてください。
