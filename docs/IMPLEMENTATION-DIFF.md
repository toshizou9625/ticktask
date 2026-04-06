# CLAUDE.md方針との実装差異

## 1. Sub Agentのツール権限（最大の差異）

**方針:** Sub Agentが独立して実装・ビルド・テストを完結させる

**実際:**

- Sub Agent A は `general-purpose` タイプで起動したが **Bashツールが使えず**静的解析のみ
- Sub Agent C は `Explore` タイプで起動したため **書き込みツールがなく**ファイル生成不可
- いずれもメインセッションで後処理が必要になった

**根本原因:** `subagent_type` の選択ミスと、ユーザーの権限設定によるBash制限。`Explore` タイプはRead専用のため書き込みタスクには不適切。

---

## 2. Phase 3の実装順序

**方針:** Phase 2完了後にPhase 3として独立して実装

**実際:** Phase 2の `lib.rs` を最初に書いた時点でTray・グローバルショートカット・5分バックアップをすでに含めてしまった。Phase 3として改めて追加したのは ActivationPolicy・フォーカスロスト自動非表示・トレイタイトルリアルタイム更新のみ。

---

## 3. Sub Agentの並行実装タイミング

**方針:** Pattern 1「フロントエンド/バックエンド並行」— メインセッションとSub Agentでコア実装を同時進行させる

**実際:** フロントエンドもバックエンドも**メインセッションで順番に実装**してから、その後Phase 4のCI/CDをSub Agent Bに委託した。CI/CDは独立タスクなので並行実装としては成立しているが、CLAUDE.mdが想定していた「コア実装の並行化」パターンとは異なる。

---

## 4. tokio依存の追加

**方針:** Cargo.tomlの依存関係はCLAUDE.mdのTech Stackに記載されたもの

**実際:** `tokio = { version = "1", features = ["time"] }` を追加。`tauri::async_runtime::spawn` 内で1秒タイマーを実装するために必要だったが、CLAUDE.mdには記載がなかった。

---

## 5. SESSION-HANDOFF.mdの更新タイミング

**方針:** Stopフック（セッション終了時）に自動更新

**実際:** 実装途中にメインセッションから手動でWrite toolを使って更新した。`.claude/settings.json` のStopフックは設定済みだが、セッション中に現状を反映するために手動更新した。

---

## 小さな差異

| 項目 | 方針 | 実際 |
| ---- | ---- | ---- |
| `AppStore` struct | store.rs に定義 | clippy の `dead_code` エラーを避けるため削除 |
| `AppError::MarkdownParse` | `AppError` に定義 | `#[allow(dead_code)]` を付与して保持 |
| REVIEW-FINDINGS.md 作成 | Sub Agentが直接書き込む | Sub Agent が READ-ONLY のためメインセッションで書き込み |
