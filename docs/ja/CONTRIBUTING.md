# Touhou Cloud DB 開発ガイド

<h2 style="text-align: left;">
    <a href="../en_US/CONTRIBUTING.md">English</a> |
    <a href="../zh_CN/CONTRIBUTING.md">中文</a> |
    <a href="../ja/CONTRIBUTING.md">日本語</a>
</h2>

## 前提条件

Touhou Cloud DB に貢献する前に、以下のツールがインストールされていることを確認してください：

### Rust ツールチェーン

本プロジェクトのバックエンドは Rust で記述されています。[rust-lang.org](https://www.rust-lang.org/) からインストールできます。バックエンドは [`server/rust-toolchain.toml`](../../server/rust-toolchain.toml) を通じて特定のツールチェーン設定を適用します：

- **Nightly チャンネル**：最新機能を利用するために Nightly バージョンを使用しています
- **必要コンポーネント**：

  - `rustfmt`: コードの整形
  - `clippy`: コードの静的解析
  - `rustc-codegen-cranelift-preview`: 高速ビルドのため

初回ビルド時に自動的にインストールされます。手動で確認・更新も可能です。

[rustup](https://rustup.rs/) の使用を推奨します。インストール後、以下のコマンドで確認できます：

```bash
# 現在のツールチェーンを確認
rustup show

# ツールチェーンを更新
rustup update
```

### 補助ツール

以下のツールも利用しています：

- **Taplo**: [Taplo](https://taplo.tamasfe.dev/) は TOML ファイルの整形・Lint 用です。

```bash
cargo install taplo-cli
```

- **Just**: [Just](https://github.com/casey/just) は便利なコマンドランナーです。共通タスクを簡単に実行できます。

```bash
cargo install just
```

利用可能なコマンドは `just --list` で確認できます。

- **Sea Orm CLI**: データベースからエンティティを自動生成します。

```bash
cargo install sea-orm-cli
```

### データベース・キャッシュ

- **PostgreSQL**：メインデータベースとして [PostgreSQL](https://www.postgresql.org/) を使用しています。インストール方法は公式ガイドを参照してください。
- **Redis**：キャッシュシステムとして [Redis](https://redis.io/) を使用しています。

### 任意ツール

- **Mold**（Unix 系 OS 限定）：ビルドを高速化する [Mold](https://github.com/rui314/mold) をインストールし、`.cargo/config.toml` の該当箇所を有効化すると便利です。

※ Windows では使用できません。

## 環境構成

### 環境変数

開発前に以下の環境変数を設定してください：

- `DATABASE_URL`: 例：`postgres://username:password@localhost:5432/database_name`
- `REDIS_URL`: 例：`redis://username:password@localhost:6379`
- `ADMIN_PASSWORD`: 開発用管理者パスワード（任意の値で OK）

Docker ではなくローカルでバックエンドを実行する場合は、`server/.env` ファイルを作成して記述するのが推奨されます（`.gitignore` 済み）。

例 `.env`：

```bash
# データベース接続（複数形式に対応）
# フォーマット1：ユーザー名・パスワードあり
DATABASE_URL=postgres://youmu:password@localhost:5432/touhou_cloud_db

# フォーマット2：OSユーザーでの認証
# DATABASE_URL=postgres://youmu@localhost:5432/touhou_cloud_db

# フォーマット3：現在のシステムユーザー
# DATABASE_URL=postgres://localhost:5432/touhou_cloud_db

# Redis（通常はローカル接続で十分）
REDIS_URL=redis://localhost:6379

# 開発用の管理者アカウント
ADMIN_PASSWORD=your_secure_password
```

### Pre-Push フック

`cargo test` を一度実行することで pre-push フックが有効になります。

このフックは `git push` 実行時に以下をチェックします：

- `taplo fmt --check` および `cargo fmt --check` によるコード整形確認
- `cargo clippy` による静的解析
- `cargo test` によるテスト

これらは [`server/.justfile`](../../server/.justfile) に `pre-push` および `check` タスクとして定義されています。

どれかに失敗すると、問題が解決されるまで push はブロックされます。これにより品質が保たれます。
