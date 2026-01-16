# タイピング練習サイト 設計ドキュメント（PHP化前提）

## 1. プロジェクト概要

本プロジェクトは、GitHub Pages 上で動作するタイピング練習サイトを、将来的に **PHP + GCP** によるバックエンド構成へ移行することを前提に設計している。

本ドキュメントは、**実装前の上流設計および API 境界の定義**を目的とする。

---

## 2. 設計方針

### 2.1 基本思想

- フロントエンド（JS）は **UX と即時性** を担当
- サーバーサイド（PHP）は **信頼性・正当性・永続化** を担当
- 両者は **API を通じてのみ通信**する

### 2.2 フレームワーク非依存

- PHP 実装は **素の PHP** を基準とする
- Laravel 等のフレームワークは、後から対応可能な構造とする

---

## 3. 状態とセッションの定義

### 3.1 セッションとは

本アプリケーションにおけるセッションとは、

> ユーザーが「スタート」を押してから、1 問のタイピング練習を完了するまでの一連の行為

を指す。

### 3.2 状態遷移

- Idle（未開始）
- Running（実行中）
- Finished（終了）

状態管理はフロントエンドで行うが、**セッションの正当性は将来サーバーが管理する**。

---

## 4. API 設計（擬似仕様）

### 4.1 セッション開始 API

```
POST /api/session/start
```

**Request**
```json
{
  "category": "basic-words"
}
```

**Response**
```json
{
  "sessionId": "abc123",
  "startedAt": "2026-01-15T15:30:00Z"
}
```

**責務**
- セッション ID の発行
- サーバー時刻での開始時刻確定

---

### 4.2 スコア送信 API

```
POST /api/score
```

**Request**
```json
{
  "sessionId": "abc123",
  "totalTyped": 120,
  "missCount": 5,
  "elapsedMs": 60000
}
```

**Server-side Responsibilities**
- セッション存在確認
- 数値妥当性チェック
- WPM / Accuracy 計算
- 永続化（DB 保存）

**Response**
```json
{
  "wpm": 55,
  "accuracy": 95.8
}
```

---

## 5. フロントエンドとサーバーの責務分離

### フロントエンド（JavaScript）
- 入力イベント処理
- 表示更新
- 一時的なカウント
- UX 制御

### サーバーサイド（PHP）
- セッションの真実
- スコア計算の最終確定
- 改ざん防止
- データ永続化

---

## 6. PHP 実装時の想定構成

```
api/
├─ index.php
├─ controllers/
│  ├─ SessionController.php
│  └─ ScoreController.php
├─ services/
│  └─ ScoreService.php
├─ repositories/
│  └─ ScoreRepository.php
└─ models/
   └─ Score.php
```

本構成は Laravel の Controller / Service / Repository 構成と思想的に一致する。

---

## 7. 本設計の狙い

- PHP を「処理を書く言語」ではなく「設計を表現する言語」として扱う
- フレームワーク使用時にも思想を流用できる
- 実務レビュー・ポートフォリオ提出に耐える設計とする

---

## 8. 今後の拡張余地

- ユーザー認証の追加
- ランキング機能
- セッション履歴閲覧

いずれも、本設計の API 境界を保ったまま追加可能である。


---

## 9. API 設計の前提と責務整理

本セクションでは、API を定義する前提となる責務分離と設計思想を文章で整理する。

- フロントエンドは **状態管理と UI 表示に専念**する
- バックエンド（PHP）は **状態の正当性保証と永続化**を担う
- API は UI 都合ではなく **業務イベント単位**で設計する

この前提により、

- フロント実装の変更が API に波及しにくい
- PHP 側の実装をフレームワークへ移行しやすい

という効果が得られる。

---

## 10. 命名規則（一般的・実務標準寄り）

### 10.1 HTML / CSS

- id：ページ内で一意・意味を表す名詞
  - kebab-case
  - 例：`#typing-app`, `#score-board`

- class：役割・状態を表す
  - kebab-case
  - 例：`.keyboard-key`, `.is-active`, `.is-expected`

---

### 10.2 JavaScript

#### 変数名
- camelCase
- 名詞 or 名詞句

```js
let currentSessionId;
let expectedIndex;
let totalTyped;
```

#### 関数名
- camelCase
- 動詞 + 目的語

```js
startSession();
updateScore();
sendScore();
```

---

### 10.3 PHP（素 PHP 前提）

#### クラス名
- PascalCase
- 単数形

```php
class ScoreService {}
class SessionController {}
```

#### メソッド名
- camelCase
- 動詞始まり

```php
public function startSession();
public function calculateScore();
```

---

### 10.4 セッション変数（PHP）

- snake_case
- 意味が即座に分かる名前

```php
$_SESSION['session_id'];
$_SESSION['started_at'];
$_SESSION['user_id'];
```

---

## 11. ログイン機能を見据えた DB 設計（最小構成・ER前提）

### users テーブル

| column | type | note |
|------|------|------|
| id | INT | PK |
| email | VARCHAR | UNIQUE |
| password_hash | VARCHAR | ハッシュ化 |
| created_at | DATETIME | |

---

### sessions テーブル（タイピング用）

| column | type | note |
|------|------|------|
| id | VARCHAR | sessionId |
| user_id | INT | nullable |
| category | VARCHAR | |
| started_at | DATETIME | |
| finished_at | DATETIME | |

---

### scores テーブル

| column | type | note |
|------|------|------|
| id | INT | PK |
| session_id | VARCHAR | FK |
| wpm | INT | |
| accuracy | FLOAT | |
| created_at | DATETIME | |

---

## 12. ER図（エンティティ関連図）

```
[users]
  id (PK)
  email (UNIQUE)
  password_hash
  created_at

     1
     |
     | (optional)
     |
     n
[sessions]
  id (PK)
  user_id (FK -> users.id, nullable)
  category
  started_at
  finished_at

     1
     |
     |
     n
[scores]
  id (PK)
  session_id (FK -> sessions.id)
  wpm
  accuracy
  created_at
```

---

## 13. クラス図（簡易）

```
[SessionController]
        |
        v
[SessionService]
        |
        v
[SessionRepository]
        |
        v
   (sessions)

[ScoreController]
        |
        v
[ScoreService]
        |
        v
[ScoreRepository]
        |
        v
    (scores)
```

---

## 14. シーケンス図（スコア送信）

```
User
 ↓ click start
Browser(JS)
 ↓ POST /api/session/start
PHP(SessionController)
 ↓ create session
Browser(JS)
 ↓ typing...
 ↓ POST /api/score
PHP(ScoreController)
 ↓ calculate & save
 ↓ response
Browser(JS)
```

---

## 15. フローチャート（セッション）

```
[Start]
   ↓
[Idle]
   ↓ start
[Running]
   ↓ finish
[Finished]
   ↓ reset
[Idle]
```

---

## 16. なぜこの段階で図を書くのか

- ログイン機能追加時に破綻しない
- PHP 実装時の迷いが消える
- フレームワーク導入時に構造を保てる

この時点でここまで整理できていれば、
**上流工程としては非常に完成度が高い状態**である。


---

## 17. 実装チェックリスト（詳細設計→実装ブリッジ）

このチェックリストは、**実装後に自己レビューするための最低限の確認項目**である。
「動いているか」ではなく、**設計どおりに書けているか**を判定する。

---

### 17.1 共通（全体構造）

- [ ] エントリポイントは `index.php` に集約されている
- [ ] URL と処理の対応が Controller に集約されている
- [ ] 直接 PHP ファイルを叩く構造になっていない
- [ ] グローバル変数の使用を最小限に抑えている

---

### 17.2 Controller

- [ ] Controller が **HTTP の責務のみ**を持っている
- [ ] 認証チェックが Controller 冒頭で行われている
- [ ] ビジネスロジックを直接書いていない
- [ ] 入力値の検証を必ず行っている

---

### 17.3 Service（業務ロジック）

- [ ] スコア計算ロジックが Service に集約されている
- [ ] ログイン・認証の判定が Service に閉じている
- [ ] Controller からは Service メソッドのみを呼んでいる
- [ ] Service は HTTP や $_SESSION を直接触らない

---

### 17.4 Repository（DB アクセス）

- [ ] SQL が Repository 以外に存在しない
- [ ] CRUD 操作が責務ごとに分離されている
- [ ] トランザクション境界が明示されている
- [ ] DB 例外をそのまま上位に投げていない

---

### 17.5 セッション管理

- [ ] `$_SESSION` に保存する値が設計どおり最小限である
- [ ] ログイン成功時に session regeneration を行っている
- [ ] ログアウト時に session を完全に破棄している
- [ ] 認証状態の判定が一元化されている

---

### 17.6 セキュリティ

- [ ] CSRF トークンを生成・検証している
- [ ] パスワードは平文で保存・比較していない
- [ ] 外部入力値をそのまま SQL に渡していない
- [ ] 表示用データをエスケープしている

---

### 17.7 フロントエンド（JS）

- [ ] API 通信処理が1箇所に集約されている
- [ ] UI 更新とロジック計算が分離されている
- [ ] エラー時の挙動が定義されている
- [ ] ログイン状態の変化に UI が追従する

---


## 18. ログイン機能（認証）詳細設計（完成版）

本設計では、以下の付加条件を前提とする。

1. メールアドレスの **ローカル部（@より前）を仮表示名** として利用する（ドメインは表示しない）
2. ログイン ID と再設定用連絡先メールは同一とし、**メール変更時は固有 ID を再生成し、履歴の関連先を更新**する
3. ランキングは **他ユーザーと比較可能な公開ランキング** とする

---

### 18.1 ユーザー識別と表示名のルール

#### 識別子（内部）
- `user_id`（INT）
- DB 内部の主キー
- 画面・API では直接表示しない

#### ログイン ID
- `email`
- 一意・必須
- 再設定用連絡先を兼ねる

#### 表示名（display_name）

- 未設定時のデフォルト：
  - email のローカル部（例：`foo.bar@example.com` → `foo.bar`）
- ユーザーが任意で変更可能
- 重複可

---

### 18.2 メールアドレス変更時の設計（重要）

#### 方針

- メールアドレスは **ユーザーの外部識別子**
- メール変更＝外部識別子の変更
- 内部的には **新しい user レコードを生成**し、
  既存の履歴（sessions / scores）を付け替える

#### 処理フロー（概念）

```
User requests email change
 ↓
Verify new email
 ↓
Create new user record
 ↓
Update sessions.user_id
 ↓
Invalidate old user record
```

#### メリット
- なりすまし・履歴混線を防止
- 監査ログが残しやすい
- 実務で説明可能な安全設計

---

### 18.3 users テーブル（最終）

| column | type | note |
|------|------|------|
| id | INT | PK |
| email | VARCHAR | UNIQUE / login ID |
| password_hash | VARCHAR | bcrypt |
| display_name | VARCHAR | default = email local part |
| profile_text | VARCHAR | nullable |
| icon_path | VARCHAR | nullable |
| is_active | BOOLEAN | 論理削除 |
| created_at | DATETIME | |

---

### 18.4 認証 API（詳細）

#### ログイン

```
POST /api/auth/login
```

- email / password 検証
- session regeneration
- `$_SESSION['user_id']` 設定

#### ログアウト

```
POST /api/auth/logout
```

- セッション破棄

---

### 18.5 ランキング設計（公開）

#### 方針

- 全ユーザー横断で比較
- 匿名ユーザーはランキング対象外
- 表示情報は **display_name / icon のみ**

#### scores テーブル拡張

| column | type | note |
|------|------|------|
| user_id | INT | FK -> users.id |

#### ランキング取得 API

```
GET /api/ranking/global
```

**Response（例）**
```json
[
  {
    "rank": 1,
    "displayName": "typing_hero",
    "wpm": 82,
    "accuracy": 97.5
  }
]
```

---

### 18.6 シーケンス図（ログイン＋ランキング）

```
User
 ↓ login
Browser(JS)
 ↓ POST /api/auth/login
PHP(AuthController)
 ↓ authenticate
 ↓ set session
Browser(JS)
 ↓ start typing
 ↓ POST /api/score
PHP(ScoreController)
 ↓ save with user_id
 ↓
GET /api/ranking/global
 ↓
Browser(JS)
```

---

### 18.7 設計上の注意点（実務視点）

- email は UI に表示しない
- ランキングは公開情報のみ使用
- display_name は信頼しない（装飾情報）
- ID 再生成は **データ移行処理として扱う**

---

## 19. セキュリティ設計（ポートフォリオ向け妥当解）

本システムは以下の前提条件を置く。

- 金融・医療などの**高機密個人情報は扱わない**
- 主なリスクは「なりすまし」「不正スコア投稿」「セッション乗っ取り」
- UX を過度に損なう多要素認証（2FA）は採用しない

---

### 19.1 CSRF 対策

- ログイン・スコア送信・プロフィール変更は **POST のみ**
- PHP セッションベースの CSRF トークンを利用

```php
$_SESSION['csrf_token']
```

- フォーム送信／fetch 時にトークン検証

**理由**
- Cookie 認証を使う以上、CSRF は必須対策
- 実装コストと効果のバランスが良い

---

### 19.2 なりすまし対策（2FAを採用しない理由）

#### 採用しない理由

- 扱う情報の重要度が低い
- 学習・練習用途に対して UX コストが高い
- メール遅延・迷惑メール問題が発生しやすい

#### 代替策（現実的対策）

- password_hash + password_verify
- ログイン成功時の session regeneration
- 連続失敗回数による簡易レート制限（将来拡張）

---

### 19.3 セッション固定・ハイジャック対策

- ログイン成功時に session_id を再生成
- logout 時は session 破棄
- HTTPS 前提（SameSite=Lax）

---

### 19.4 スコア不正対策（最低限）

- スコア送信はログインユーザーのみ許可
- サーバー側で値の妥当性チェック
- 異常値はランキング対象外

---

### 19.5 セキュリティ設計まとめ（レビュー向け説明）

本システムでは、

- **脅威レベルに見合った対策のみを実装**
- UX を損なう過剰な認証は行わない
- 拡張余地（2FA・メール認証）は設計段階で確保

という判断を行っている。

これは「実装できる」よりも、
**「なぜ実装しないかを説明できる」設計である。**

---

## 20. 本設計の到達点（ポートフォリオ用総括）

- フレームワーク非依存の PHP 設計
- 上流工程（ER / API / 認証 / セキュリティ）を一貫して記述
- 将来の Laravel 等への移行を想定した責務分離
- 学習用途と実務妥当性のバランスを取った判断

本 README は、
**「設計ができること」を示すための提出物**として完成している。

---

※ 本 README はここまでを**最終提出用ドキュメント**とする。
