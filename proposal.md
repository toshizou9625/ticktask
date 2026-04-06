# TickTask — 企画書・設計詳細方針

> **TickTask** — Tick(時を刻む) + Task(タスク) = タスクを刻む

## 概要

作業中のタスクをワンクリックで切り替えながら、どのタスクにどれだけ時間をかけたかを自動で記録するmacOS常駐アプリ。記録はMarkdownファイルに保存され、Obsidianで確認できる。

本プロジェクトは **Claude Code勉強会の教材** を兼ねる。Skills・Sub Agent・Hooksの3機能を意図的に活用し、その体験をスライド発表する。

---

## コンセプト

- **摩擦ゼロ** — タスクボタンを押すだけ。入力・確認・保存の手間を一切かけない
- **完全ローカル** — 外部サーバー・API通信なし。業務情報が外に出ない
- **Obsidian連携** — 日々のメモと同じファイルに時間記録セクションだけを自動追記

### アプリアイコン

- メニューバーアイコン: 16×16px のモノクロSFシンボル風アイコン。時計モチーフにチェックマークを組み合わせたシンプルなデザイン
- メニューバー表示状態:
  - 計測中: アイコン + タスク名 + 経過時間（例: `🔴 設計書修正 0:42`）
  - 中断中: アイコンに ⏸ を重ねて表示
  - 待機中（全停止状態）: アイコンのみ
- アプリケーションアイコン（.icns）: 時計の文字盤にチェックリストを重ねたデザイン。macOSの角丸四角に収まるように配置
- MVP段階ではmacOS標準の `timer` SF Symbolをメニューバーアイコンとして使用し、アプリケーションアイコンはTauriデフォルトのままとする

---

## 技術スタック

| 項目 | 内容 |
|---|---|
| プラットフォーム | macOS |
| フレームワーク | Tauri v2 |
| UI | React + Tailwind CSS |
| タスクリスト保存 | tauri-plugin-store（アプリローカル） |
| 時間記録保存 | Markdownファイル（ユーザー指定フォルダ） |
| CI/CD | GitHub Actions |
| 外部通信 | **なし** |

### Tauri v2 プラグイン

| プラグイン | 用途 |
|---|---|
| `tauri-plugin-store` | タスクリスト・セッション状態の永続化 |
| `tauri-plugin-global-shortcut` | `⌘+Shift+T` によるポップオーバー開閉 |
| `tauri-plugin-dialog` | 設定パネルでの保存先フォルダ選択（OSネイティブダイアログ） |
| Tray API（Tauri v2コア） | メニューバー常駐・アイコン・タイトル更新 |

※ Tauri v2ではTray機能はコアAPIに統合されているため、別途プラグインは不要。

---

## 機能仕様

### 常駐・起動

- メニューバーに常駐
- メニューバーに現在のタスク名と経過時間を常時表示（例: `🔴 設計書修正 0:42`）
- グローバルショートカット `⌘+Shift+T` でどのアプリからでもポップオーバーを開閉

### タスク操作

- タスクボタンを1クリックで計測開始
- 別のタスクに切り替えると、前のタスクが自動停止・記録
- 中断ボタンで一時停止（離席・割り込み対応）
- 中断中はメニューバーアイコンに ⏸ を重ねて表示、ポップオーバー内のタスク表示はグレーアウト

### タスクリスト

- 直近使用順（MRU）で自動並び替え
- テキスト入力で新規タスクを追加 → リストに自動追加
- 設定パネルから追加・削除が可能（並び替えは自動のみ）

### 終業操作

- 「全停止」ボタンで計測中タスクを停止し、Markdownへ最終書き込み
- ポップオーバーを閉じただけでは計測は継続する（意図しない停止を防ぐ）

### 設定パネル（ミニマム）

```
┌────────────────────┐
│ タスクリスト編集     │
├────────────────────┤
│ 要件定義        [×] │
│ 設計書修正      [×] │
│ コードレビュー   [×] │
├────────────────────┤
│ + ________________  │
├────────────────────┤
│ 保存先フォルダ       │
│ ~/Obsidian/Daily [📁]│
└────────────────────┘
```

- `[📁]` ボタンは `tauri-plugin-dialog` の `open` API（ディレクトリ選択モード）でOSネイティブのフォルダ選択ダイアログを表示する
- 選択されたパスはstoreに `outputDir` として保存される

### 初回起動時のオンボーディング

初回起動時（storeに `outputDir` が未設定の場合）はポップオーバーの代わりにオンボーディング画面を表示する。

```
┌──────────────────────────┐
│ TickTask へようこそ        │
├──────────────────────────┤
│                          │
│ 作業記録の保存先を選択      │
│ ~/Obsidian/Daily    [📁] │
│                          │
├──────────────────────────┤
│ よく使うタスクを登録        │
│ __________________ [追加]  │
│                          │
│  • 要件定義          [×]  │
│  • コードレビュー     [×]  │
│                          │
├──────────────────────────┤
│       [はじめる]           │
└──────────────────────────┘
```

- フォルダ未選択の状態では「はじめる」ボタンは非活性
- タスクは0件でも開始可能（後から追加できる）
- 「はじめる」を押すとstoreに保存し、通常のポップオーバーに遷移する
- 2回目以降の起動ではオンボーディングをスキップし、直接ポップオーバーを表示する

---

## 画面構成

```
┌────────────────────────┐
│ 🔴 設計書修正  0:42    │  ← 現在のタスクと経過時間
├────────────────────────┤
│ [要件定義] [設計書修正] │
│ [コードレビュー] [会議] │  ← タスクボタン（MRU順、最大8個表示）
├────────────────────────┤
│ 🔍 __________________ │  ← 新規タスク入力（兼 タスク検索）
├────────────────────────┤
│ ⏸ 中断  ⏹ 全停止  ⚙ │
└────────────────────────┘
```

### ポップオーバーのサイズ制約

- ポップオーバーの固定サイズ: 幅 320px、高さ最大 400px
- タスクボタンエリアには **MRU上位8個** のみ表示する（2列×4行）
- 9個目以降のタスクは新規タスク入力欄で名前を途中まで入力すると候補として表示される（インクリメンタル検索）
- 検索候補をクリックすると、そのタスクの計測を開始する（新規追加と同じ操作感）
- これにより、タスクが数十個に増えてもポップオーバーのサイズは一定に保たれる

---

## データ設計

### tauri-plugin-store に保存するデータ

2種類のデータをstoreで管理する。

**① タスクリスト（マスターデータ）**

```json
{
  "tasks": [
    { "id": "uuid-1", "name": "要件定義", "lastUsedAt": "2026-04-03T10:30:00" },
    { "id": "uuid-2", "name": "設計書修正", "lastUsedAt": "2026-04-03T14:00:00" },
    { "id": "uuid-3", "name": "新規タスク", "lastUsedAt": null }
  ],
  "outputDir": "~/Obsidian/Daily"
}
```

- MRU順の並び替えは `lastUsedAt` の降順で行う
- `lastUsedAt` が `null`（一度も使っていないタスク）はリストの末尾に、追加順で表示する
- タスクの計測を開始した時点で `lastUsedAt` を現在時刻に更新する

**② 計測セッション状態**

```json
{
  "activeTaskId": "uuid-2",
  "startedAt": "2026-04-03T14:00:00",
  "isPaused": false,
  "todayAccumulated": {
    "uuid-1": 5400,
    "uuid-2": 2700
  }
}
```

- `startedAt`: 現在の計測区間の開始時刻（再開時にリセットされる。中断中は `null`）
- `isPaused`: 中断状態フラグ（UIの表示制御に使用）
- `todayAccumulated`: タスクIDごとの当日累計秒数（中断・切替のたびに加算される）

### 経過時間の算出方法

経過時間は **`todayAccumulated` + 現在の計測区間** の合計で算出する。

- **表示上の経過時間** = `todayAccumulated[taskId]` + (`now` - `startedAt`)
- **中断時**: `now` - `startedAt` を `todayAccumulated[taskId]` に加算し、`startedAt` をクリアする
- **再開時**: `startedAt` を現在時刻にセットする（`todayAccumulated` はそのまま）
- **切替時**: 中断と同じ加算処理を行ったあと、新タスクの `startedAt` を現在時刻にセットする

この方式により、中断→再開を何度繰り返しても `todayAccumulated` に正しく蓄積される。storeには `todayAccumulated` と `startedAt` だけ保存すれば、アプリ再起動後も正確に復元できる。

**具体例**: 10:00開始 → 10:30中断（accumulated += 1800s）→ 10:45再開（startedAt = 10:45）→ 11:15停止（accumulated += 1800s）→ 累計 = 3600s = 1:00

### 保存タイミング（イベント駆動）

storeへの書き込みは以下のイベント時のみ行う。定期保存は行わない。

| イベント | store書き込み内容 |
|---|---|
| タスク開始 | セッション状態（activeTaskId, startedAt） |
| タスク切替 | 前タスクのaccumulated加算 + 新タスクのstartedAt + Markdown書き出し |
| 中断 | accumulated加算 + isPaused=true + startedAtクリア |
| 再開 | startedAt=now + isPaused=false |
| 全停止 | accumulated加算 + セッション状態リセット + Markdown最終書き出し |
| タスクリスト編集 | タスクリスト |
| アプリ終了 | accumulated加算 + Markdown書き出し |
| 定期バックアップ（5分） | accumulated加算 + startedAtリセット（Markdown書き出しなし） |

**クラッシュ時のリスクと対策**: 最後のイベントから現在までの計測区間（`startedAt` 〜 クラッシュ時刻）が失われる。`todayAccumulated` に蓄積済みの分は保全される。

対策として、計測中に限り **5分間隔の定期バックアップ** を行う。

- Rust側で `startedAt` が `null` でない間、5分ごとにタイマーを発火する
- 発火時に現在の計測区間を `todayAccumulated` に加算し、`startedAt` を現在時刻にリセットしてstoreに保存する
- これにより最大損失は5分間に限定される
- Markdown書き出しは定期バックアップでは行わない（イベント駆動のみ）。ファイルI/Oの頻度を抑えるため

---

## Markdownファイル仕様

### ファイル構成

```
{ユーザー指定フォルダ}/
├── 2026-04-03.md
├── 2026-04-02.md
└── ...
```

### ファイルフォーマット

```markdown
# 2026-04-03

今日の朝会でAさんから共有があった。
来週までに設計書のレビューが必要。

---

## ⏱ 作業時間

| タスク | 時間 |
|--------|------|
| 要件定義 | 1:30 |
| 設計書修正 | 1:15 |
| コードレビュー | 0:45 |

合計: 3:30

---

明日やること

レビューコメントの返答
```

### 更新ルール

- `## ⏱ 作業時間` セクションのみを自動更新。他のメモには一切触れない
- ファイルが存在しない場合 → 新規作成（下記「新規作成時のフォーマット」参照）
- セクションが存在しない場合 → ファイル末尾に `---` で区切って追加
- 同名タスクは時間を合算（中断・再開を繰り返しても1行にまとめる）
- タスクの並び順はその日最初に着手した順を維持
- 時間フォーマット: `H:MM`（例: `1:30`, `0:45`）
- 更新タイミング: タスク切替・中断・全停止・アプリ終了時

### 新規作成時のフォーマット

ファイルが存在しない場合、アプリが以下の内容で新規作成する。

```markdown
# 2026-04-03

---

## ⏱ 作業時間

| タスク | 時間 |
|--------|------|
| 要件定義 | 0:30 |

合計: 0:30
```

- `# YYYY-MM-DD` ヘッダーは必ずアプリが生成する
- ヘッダーと作業時間セクションの間に `---` を入れ、ユーザーがメモを追記できるスペースを確保する
- Obsidianでユーザーがヘッダー下にメモを追記しても、アプリは作業時間セクションだけを更新するため干渉しない

### Obsidianとの競合対策

書き込み時は以下の手順で部分更新を行い、ユーザーのメモを破壊しない。

1. ファイル全体を読み込む
2. `## ⏱ 作業時間` セクションの開始位置と終了位置（次の `---` または `##` またはEOF）を特定する
3. そのセクションだけを新しい内容で差し替える
4. ファイル全体を書き戻す

Obsidianはファイル変更を検知して自動リロードするため、特別な連携処理は不要。

### 日付またぎの処理

タスク切替・中断・全停止時に現在日付をチェックする。日付の境界は **00:00:00 ローカル時刻** とする。

日付が変わっていた場合:

1. 現在の計測区間を按分する: `startedAt` 〜 `23:59:59` を旧日付、`00:00:00` 〜 現在時刻を新日付に計上
2. 旧日付の `todayAccumulated` に旧日付分を加算し、旧日付のMarkdownファイルに書き出す
3. `todayAccumulated` を新日付用にリセットし、新日付分の秒数で初期化する
4. 以降は新日付のMarkdownファイルに対して更新を行う

**注意**: 複数日をまたぐケース（2日以上放置）は想定しない。1日以上放置された場合は、全時間を最終操作日に計上する（簡易実装）。

---

## アプリアーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────────┐
│              React UI Layer             │
│  コンポーネント表示・ユーザー操作の受付     │
│  ※ ファイルI/O・Store操作は一切行わない    │
├─────────────────────────────────────────┤
│           Tauri Command Layer           │
│  薄いアダプタ。引数のバリデーションと       │
│  Rust層の呼び出し、エラー変換のみ          │
├─────────────────────────────────────────┤
│            Rust Core Layer              │
│  ビジネスロジック全般:                     │
│  - タスク管理（CRUD, MRUソート）           │
│  - 時間計算（開始・中断・再開・停止）       │
│  - Markdownパーサー（セクション検出・差替）  │
│  - Store永続化                           │
├─────────────────────────────────────────┤
│           OS / File System              │
│  tauri-plugin-store, fs, tray,         │
│  global-shortcut, dialog               │
└─────────────────────────────────────────┘
```

### ディレクトリ構成

```
ticktask/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/          # Tauri Command Layer（薄いアダプタ）
│   │   │   ├── mod.rs
│   │   │   ├── task.rs        # タスクCRUD系コマンド
│   │   │   ├── timer.rs       # 計測開始・停止・中断系コマンド
│   │   │   └── settings.rs    # 設定系コマンド
│   │   ├── core/              # Rust Core Layer（ビジネスロジック）
│   │   │   ├── mod.rs
│   │   │   ├── task_manager.rs
│   │   │   ├── time_tracker.rs
│   │   │   ├── markdown.rs    # MDパーサー・更新ロジック
│   │   │   └── store.rs       # Store操作の抽象化
│   │   └── error.rs           # 統一エラー型
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── TaskBoard.tsx      # タスクボタン一覧
│   │   ├── ActiveTask.tsx     # 現在のタスク・経過時間表示
│   │   ├── TaskInput.tsx      # 新規タスク入力（兼インクリメンタル検索）
│   │   ├── ControlBar.tsx     # 中断・全停止・設定ボタン
│   │   ├── SettingsPanel.tsx  # 設定パネル
│   │   └── Onboarding.tsx     # 初回起動時のセットアップ画面
│   ├── hooks/
│   │   ├── useTimer.ts        # 経過時間のリアルタイム表示
│   │   └── useTauriCommand.ts # Tauri invoke のラッパー
│   └── lib/
│       └── types.ts           # 共有型定義
├── docs/
│   └── SESSION-HANDOFF.md     # Claude Code Stopフックが自動更新
├── .github/
│   └── workflows/
│       ├── ci.yml             # PR / push: ビルド + テスト
│       └── release.yml        # タグプッシュ: ビルド + GitHub Releases
├── .claude/skills/                    # Claude Code Skills
│   ├── tauri-commands.md
│   ├── markdown-format.md
│   ├── react-components.md
│   ├── architecture-review.md
│   └── github-actions-tauri.md
├── CLAUDE.md
├── package.json
└── tailwind.config.js
```

### エラーハンドリング方針

Rust側で統一エラー型を定義し、すべてのCommandから一貫した形式でフロントエンドに伝搬する。

```rust
// src-tauri/src/error.rs
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("ファイル操作エラー: {0}")]
    FileIO(#[from] std::io::Error),
    #[error("Store操作エラー: {0}")]
    Store(String),
    #[error("Markdown解析エラー: {0}")]
    MarkdownParse(String),
    #[error("タスクが見つかりません: {0}")]
    TaskNotFound(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}
```

### 状態管理方針（React側）

React側の状態は `useContext` + `useReducer` で管理する。この規模のアプリでは外部状態管理ライブラリは不要。

- **TimerContext**: 現在のタスクID・開始時刻・中断状態・今日の累計時間
- **TaskListContext**: タスクリスト・設定（出力先フォルダ）

Tauri CommandへのinvokeはカスタムHook（`useTauriCommand`）経由で行い、コンポーネントがTauri APIを直接呼ばないようにする。

---

## GitHub Actions

### ワークフロー分割

| ファイル | トリガー | 内容 |
|---|---|---|
| `ci.yml` | PR, push to main | `cargo test` + `cargo clippy` + フロントエンドビルド |
| `release.yml` | タグプッシュ (`v*`) | ユニバーサルバイナリビルド + GitHub Releasesにアップロード |

### ビルド構成

- ランナー: `macos-latest`
- ターゲット: `universal-apple-darwin`（Intel + Apple Silicon）
- キャッシュ: `Cargo.lock` ハッシュによるRustターゲットキャッシュ + `package-lock.json` による `node_modules` キャッシュ
- リリース: `tauri-apps/tauri-action` を使用してビルド + アーティファクト生成

### 署名・ノータリゼーション

MVP段階ではスキップ。本番配布時には以下のGitHub Secretsを設定して対応する（テンプレートをコメントアウトで `release.yml` に含めておく）。

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

---

## Claude Code 活用方針

本プロジェクトはClaude Code勉強会の教材を兼ねる。以下の3機能を意図的に活用し、開発体験をスライド発表する。

### Skills（知識注入）

CLAUDE.mdから参照する5つのSkillファイルで、Claude Codeにプロジェクト固有の知識を与える。

```markdown
# CLAUDE.md での参照
## Skills
### 実装ガイド
- Tauri command patterns: @.claude/skills/tauri-commands.md
- Markdown file format spec: @.claude/skills/markdown-format.md
- React component conventions: @.claude/skills/react-components.md
### レビュー・CI
- Architecture review checklist: @.claude/skills/architecture-review.md
- GitHub Actions build config: @.claude/skills/github-actions-tauri.md
```

**.claude/skills/tauri-commands.md** — Tauri v2のcommand定義パターン。`#[tauri::command]` の書き方、`Result<T, AppError>` による統一エラー返却、フロントエンドからの `invoke` 呼び出し規約。Tauri v2はAPIが大きく変わっているため、正しいパターンをSkillに明記することで生成精度を上げる。

**.claude/skills/markdown-format.md** — 本企画書の「Markdownファイル仕様」セクションをそのまま転記。セクション検出ルール、更新ルール、競合対策の手順を含む。パーサー実装とテスト生成の両方でこのSkillが参照される。

**.claude/skills/react-components.md** — コンポーネント設計方針。Tailwind CSSのユーティリティクラスの使い方、Tauri API呼び出し層の分離ルール（コンポーネントが直接invokeしない）、`useContext` + `useReducer` による状態管理パターン。

**.claude/skills/architecture-review.md** — レビューアーキテクトロール。以下の4観点でコードベースをレビューさせる。
1. **レイヤー分離**: ファイルI/OがReact側に漏れていないか、Command層がビジネスロジックを抱えていないか
2. **エラーハンドリングの一貫性**: 全Commandが `AppError` を返しているか、フロントエンドへのエラー伝搬が統一されているか
3. **状態管理の妥当性**: React側の状態の所在が明確か、不要なprop drillingが発生していないか
4. **Markdown更新の安全性**: 書き込み前の読み直し、セクション境界の検出精度、同名タスク合算の正確性

**.claude/skills/github-actions-tauri.md** — CI/CDの構成パターン。ci.ymlとrelease.ymlの分割方針、キャッシュキー設計、`tauri-apps/tauri-action` の設定、署名テンプレートのコメントアウト配置。

### Sub Agent（並列実行）

独立性の高いタスクをSub Agentで並列実行する。

**パターン1: フロントエンド / バックエンド並列**
- メインセッション: React UIコンポーネントの実装
- Sub Agent A: Rust側のMarkdownパーサーとファイル操作コマンドの実装 + ユニットテスト

**パターン2: 実装 / テスト並列**
- メインセッション: 機能実装を継続
- Sub Agent B: `.claude/skills/markdown-format.md` の仕様に基づいてエッジケーステストを網羅的に生成

**パターン3: 実装 / レビュー並列**
- メインセッション: 修正作業
- Sub Agent C: `.claude/skills/architecture-review.md` の観点に基づいてコードベースレビュー → 指摘事項をまとめる

### Hooks（自動制御）

`.claude/settings.json` に設定するライフサイクルフック。

**PostToolUse: 自動フォーマット**
- `.rs` ファイル編集時 → `cargo fmt` を自動実行
- `.tsx` / `.ts` ファイル編集時 → `prettier --write` を自動実行
- Claude Codeのフォーマットのばらつきを排除し、差分をクリーンに保つ

**PreToolUse: 危険コマンドのブロック**
- `cargo publish`, `npm publish`, `rm -rf` 等の意図しない実行を防止
- 勉強会中の事故防止にも有効

**Stop: セッション引き継ぎ**
- セッション終了時に `docs/SESSION-HANDOFF.md` を自動更新
- 次回セッション開始時にClaude Codeがハンドオフファイルを読み込み、前回の続きからスムーズに再開
- 勉強会が複数日にまたがる場合に実用的に機能する

---

## 開発フェーズ

### Phase 1: プロジェクト基盤

**ゴール**: Claude Codeがプロジェクトのコンテキストを正しく理解した状態を作る

1. `create-tauri-app` でプロジェクト生成（テンプレート: React + TypeScript）
2. `/init` でCLAUDE.md雛形生成 → Skillsの参照を追加
3. 5つのSkillファイルを作成
   - `.claude/skills/tauri-commands.md` — Tauri v2公式ドキュメントからcommandパターンを転記
   - `.claude/skills/markdown-format.md` — 本企画書の「Markdownファイル仕様」セクションを転記
   - `.claude/skills/react-components.md` — 状態管理方針・コンポーネント設計ルールを記述
   - `.claude/skills/architecture-review.md` — レビュー4観点を記述
   - `.claude/skills/github-actions-tauri.md` — CI/CD構成パターンを記述
4. Hooksを `.claude/settings.json` に設定
   - PostToolUse: `cargo fmt` / `prettier --write`
   - PreToolUse: `cargo publish` / `npm publish` / `rm -rf` ブロック
   - Stop: `docs/SESSION-HANDOFF.md` 自動更新
5. 共通型定義の作成
   - `src-tauri/src/error.rs` — 統一エラー型 `AppError`
   - `src/lib/types.ts` — フロントエンド側の型定義（Task, SessionState, TimerContext など）
6. Tauri プラグインの依存追加
   - `Cargo.toml` に `tauri-plugin-store`, `tauri-plugin-global-shortcut`, `tauri-plugin-dialog` を追加
   - `tauri.conf.json` の `plugins` セクションを設定

**Phase 1 完了基準**: `cargo build` と `npm run dev` が通り、空のポップオーバーウィンドウが表示される

### Phase 2: コア機能（Sub Agent並列）

**ゴール**: タスク操作とMarkdown記録がローカルウィンドウ上で動作する

**メインセッション: React UI**

実装順序:
1. `TimerContext` / `TaskListContext` のProvider定義（`useContext` + `useReducer`）
2. `Onboarding.tsx` — storeに `outputDir` がなければ表示。フォルダ選択とタスク初期登録
3. `ActiveTask.tsx` — 現在のタスク名と経過時間の表示。`useTimer` フックで1秒ごとに `todayAccumulated + (now - startedAt)` を再計算
4. `TaskBoard.tsx` — MRU上位8個のボタン表示。クリックで `invoke("switch_task")` を発火
5. `TaskInput.tsx` — テキスト入力で新規タスク追加。入力中はインクリメンタル検索で既存タスクを候補表示
6. `ControlBar.tsx` — 中断 / 再開 / 全停止 / 設定ボタン
7. `SettingsPanel.tsx` — タスクリスト編集（追加・削除）、保存先フォルダ変更

**Sub Agent A: Rust Core Layer**

実装順序:
1. `core/store.rs` — tauri-plugin-store のラッパー。タスクリストとセッション状態のCRUD
2. `core/task_manager.rs` — タスクの追加・削除・MRUソート。`lastUsedAt` の更新
3. `core/time_tracker.rs` — 計測開始・中断・再開・停止・切替のロジック。`todayAccumulated` の加算。5分間隔の定期バックアップタイマー。日付またぎ検出と按分
4. `core/markdown.rs` — MDファイルの読み込み、`## ⏱ 作業時間` セクションの検出、差し替え、新規作成。同名タスク合算。`H:MM` フォーマットの生成
5. 各モジュールのユニットテスト（特に `markdown.rs` のエッジケース）
6. `commands/task.rs`, `commands/timer.rs`, `commands/settings.rs` — 上記coreの薄いアダプタ

**結合**

- フロントエンドの `useTauriCommand` フックから各commandを `invoke` で呼び出し
- 動作確認: タスク作成 → 計測開始 → 切替 → 中断 → 全停止の一連フロー
- Markdownファイルが正しく生成・更新されることを確認

**Phase 2 完了基準**: 通常ウィンドウ上でタスク操作が動作し、指定フォルダにMarkdownファイルが正しく出力される

### Phase 3: 常駐機能

**ゴール**: メニューバー常駐アプリとして動作する

1. **Tray設定** — Tauri v2コアTray APIでメニューバーにアイコンを表示。SF Symbol `timer` を使用。計測中はタスク名+経過時間をタイトルに設定、中断中は ⏸ アイコン、待機中はアイコンのみ
2. **ポップオーバーウィンドウ** — Trayクリックでポップオーバーを表示/非表示。ウィンドウサイズ 320×400px 固定。ウィンドウの装飾なし（タイトルバー非表示）。フォーカスが外れたら自動で非表示
3. **グローバルショートカット** — `⌘+Shift+T` でポップオーバーを開閉。`tauri-plugin-global-shortcut` で登録
4. **フォルダ選択ダイアログ** — 設定パネルとオンボーディングの `[📁]` ボタンに `tauri-plugin-dialog` を接続
5. **Trayタイトルのリアルタイム更新** — 計測中は1秒ごとにTrayタイトルを更新。Rust側のタイマーからTray APIを呼び出す（フロントエンドを経由しない）

**Phase 3 完了基準**: メニューバーからすべての操作が完結し、`⌘+Shift+T` で任意のアプリからポップオーバーを呼び出せる

### Phase 4: CI/CD

**ゴール**: PRで自動テスト、タグプッシュでリリースバイナリが生成される

1. **`ci.yml`** の構築
   - トリガー: PR、push to main
   - ステップ: Rust toolchain setup → `cargo test` → `cargo clippy -- -D warnings` → Node.js setup → `npm ci` → `npm run build` → Tauri build（署名なし）
   - キャッシュ: `~/.cargo/registry` + `target/` を `Cargo.lock` ハッシュで、`node_modules` を `package-lock.json` ハッシュで
2. **`release.yml`** の構築
   - トリガー: タグプッシュ (`v*`)
   - `tauri-apps/tauri-action` でユニバーサルバイナリ（`universal-apple-darwin`）をビルド
   - GitHub Releasesにアーティファクト（`.dmg`）をアップロード
   - 署名・ノータリゼーションのテンプレートをコメントアウトで配置

**Phase 4 完了基準**: PRでCIが通り、`v0.1.0` タグのプッシュでGitHub Releasesに `.dmg` が自動生成される

### Phase 5: 品質確認

**ゴール**: アーキテクチャの一貫性を確認し、リリース品質にする

1. **アーキテクチャレビュー**（Sub Agent）
   - `.claude/skills/architecture-review.md` の4観点で全ファイルをスキャン
   - 指摘事項を `docs/REVIEW-FINDINGS.md` にまとめる
2. **指摘事項の修正**
   - レイヤー違反（React側のファイルI/O、Command層のロジック肥大化など）の修正
   - エラーハンドリングの統一漏れを修正
3. **手動テストシナリオ**
   - 初回起動 → オンボーディング → フォルダ選択 → タスク登録 → はじめる
   - タスク計測 → 切替 → 中断 → 再開 → 全停止 → Markdownファイル確認
   - Obsidianで同じファイルを開いた状態での更新確認
   - 日付またぎ（システム時刻を手動変更して確認）
   - アプリ強制終了 → 再起動後にaccumulatedが復元されていること
   - タスク9個以上登録 → インクリメンタル検索で9個目以降にアクセスできること
4. **最終ビルド確認**
   - `v0.1.0` タグをプッシュし、GitHub Releasesから `.dmg` をダウンロード → インストール → 動作確認

**Phase 5 完了基準**: レビュー指摘がすべて解消され、手動テストシナリオが全項目パスする

---

## Claude Code 指示フロー

本企画書をClaude Codeに渡して開発を進める際の、具体的な指示の流れを記載する。

### Phase 1: プロジェクト基盤

```
# 1-1. プロジェクト生成
npm create tauri-app@latest ticktask -- --template react-ts
cd ticktask

# 1-2. Claude Code 初期化
claude
> /init
```

CLAUDE.md が生成されたら、Skills参照を手動で追加する。

```
> CLAUDE.mdにSkillsの参照を追加して。以下の5ファイルを参照する構成にして。
> - .claude/skills/tauri-commands.md
> - .claude/skills/markdown-format.md
> - .claude/skills/react-components.md
> - .claude/skills/architecture-review.md
> - .claude/skills/github-actions-tauri.md
```

```
> proposal.md を読んで、.claude/skills/tauri-commands.md を作成して。
> Tauri v2のcommand定義パターン、Result<T, AppError>による統一エラー返却、
> フロントエンドからのinvoke呼び出し規約を含めて。
> Tauri v2の最新APIをWebで確認してから書いて。
```

```
> proposal.md の「Markdownファイル仕様」セクションを .claude/skills/markdown-format.md に転記して。
> セクション検出ルール、更新ルール、新規作成フォーマット、競合対策、日付またぎの処理を含めて。
```

```
> proposal.md を読んで、.claude/skills/react-components.md を作成して。
> コンポーネント設計方針、Tailwind CSSのルール、useTauriCommandによるinvoke層分離、
> useContext + useReducerによる状態管理パターンを含めて。
```

```
> proposal.md の「アーキテクチャ」セクションを読んで、.claude/skills/architecture-review.md を作成して。
> レイヤー分離・エラーハンドリング一貫性・状態管理妥当性・Markdown更新安全性の4観点を
> チェックリスト形式で書いて。
```

```
> proposal.md の「GitHub Actions」セクションを読んで、.claude/skills/github-actions-tauri.md を作成して。
> ci.ymlとrelease.ymlの分割方針、キャッシュキー設計、tauri-apps/tauri-actionの設定、
> 署名テンプレートのコメントアウト配置を含めて。
```

```
> .claude/settings.json にHooksを設定して。
> - PostToolUse: .rsファイル編集時にcargo fmt、.tsx/.tsファイル編集時にprettier --write
> - PreToolUse: cargo publish, npm publish, rm -rf をブロック
> - Stop: docs/SESSION-HANDOFF.md を自動更新
```

```
> proposal.md の「エラーハンドリング方針」に従って src-tauri/src/error.rs を作成して。
> 次に proposal.md の「データ設計」に従って src/lib/types.ts を作成して。
> 最後に Cargo.toml に tauri-plugin-store, tauri-plugin-global-shortcut, tauri-plugin-dialog を追加して、
> tauri.conf.json の plugins セクションも設定して。
```

### Phase 2: コア機能（Sub Agent並列）

```
> proposal.md のPhase 2「メインセッション: React UI」の実装順序に従って、
> React UIコンポーネントを順番に実装して。
> まず TimerContext と TaskListContext のProvider定義から始めて。
> .claude/skills/react-components.md のルールに従うこと。
```

Sub Agent を起動してRust側を並列で進める。

```
> /task proposal.md のPhase 2「Sub Agent A: Rust Core Layer」の実装順序に従って、
> Rust Core Layerを実装して。core/store.rs → task_manager.rs → time_tracker.rs → markdown.rs の順で。
> .claude/skills/tauri-commands.md と .claude/skills/markdown-format.md を参照すること。
> 各モジュールのユニットテストも書いて。特にmarkdown.rsのエッジケースを重点的に。
```

Sub Agent完了後、結合する。

```
> commands/task.rs, commands/timer.rs, commands/settings.rs を作成して、
> coreモジュールの薄いアダプタとして実装して。
> フロントエンドの useTauriCommand フックから各commandをinvokeで呼び出せるように接続して。
> タスク作成 → 計測開始 → 切替 → 中断 → 全停止の一連フローが動くことを確認して。
```

### Phase 3: 常駐機能

```
> proposal.md のPhase 3に従って、メニューバー常駐機能を実装して。
> 1. Tauri v2コアTray APIでメニューバーにSF Symbol timer アイコンを表示
> 2. Trayクリックでポップオーバー（320x400px固定、装飾なし、フォーカス外で非表示）を表示/非表示
> 3. tauri-plugin-global-shortcut で ⌘+Shift+T を登録
> 4. 計測中は1秒ごとにTrayタイトルをRust側から直接更新
> 5. 設定パネルとオンボーディングの📁ボタンに tauri-plugin-dialog を接続
> Tauri v2のTray APIとウィンドウ制御の最新仕様をWebで確認してから実装して。
```

### Phase 4: CI/CD

```
> proposal.md のPhase 4と.claude/skills/github-actions-tauri.md に従って、
> .github/workflows/ci.yml と .github/workflows/release.yml を作成して。
> ci.yml: PR/push to mainでcargo test + cargo clippy + フロントエンドビルド
> release.yml: v*タグでtauri-apps/tauri-actionによるユニバーサルバイナリビルド + GitHub Releases
> 署名・ノータリゼーションのテンプレートはコメントアウトで含めて。
```

### Phase 5: 品質確認

```
> /task .claude/skills/architecture-review.md の4観点でコードベース全体をレビューして。
> 指摘事項を docs/REVIEW-FINDINGS.md にまとめて。
```

レビュー結果を確認し、修正を進める。

```
> docs/REVIEW-FINDINGS.md の指摘事項を順番に修正して。
> 修正ごとにどの指摘に対応したかをコミットメッセージに含めて。
```

```
> proposal.md のPhase 5「手動テストシナリオ」を確認して、
> 自動テストでカバーできる項目があればテストを追加して。
> 特にMarkdownのエッジケース（ファイル新規作成、セクション未存在、同名タスク合算）を重点的に。
```

最終確認。

```
> cargo test && npm run build で全テストとビルドが通ることを確認して。
> 問題があれば修正して。
```
