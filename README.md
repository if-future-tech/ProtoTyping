```markdown
# ProtoTyping (タイピング アプリケーション)

Cloud Run と Firebase Hosting を活用した、タイピング学習・測定Webアプリケーションのモノレポです。

## 🏗 システム構成

* **フロントエンド**: Firebase Hosting
* **バックエンド**: Google Cloud Run (Docker / Node.js or Python API)
* **データベース / 認証**: Firebase (Firestore, Firebase Auth)
* **CI/CD**: GitHub Actions

---

## 🚀 デプロイ (CI/CD)

本リポジトリは GitHub Actions による自動デプロイに対応しています。`main` ブランチへの Push または手動実行（`workflow_dispatch`）により、各環境へ自動デプロイされます。

### ワークフロー一覧

| 対象 | 監視ディレクトリ | トリガー | 概要 |
| :--- | :--- | :--- | :--- |
| **Frontend** | リポジトリ全体 | `main` Push / PR | Firebase Hosting へのデプロイ |
| **Backend** | `backend/**` | `main` Push / 手動実行 | Dockerイメージをビルドし Cloud Run へのデプロイ |

### 必要な GitHub Secrets 設定

自動デプロイを正常に機能させるため、GitHub リポジトリの `Settings > Secrets and variables > Actions` に以下の環境変数を設定してください。

* `GCP_SA_KEY`: GCP サービスアカウント (`github-action-deploy`) の JSON 鍵全文
* `GCP_PROJECT_ID`: GCP プロジェクト ID (`prototyping-486508`)
* `FIREBASE_API_KEY`: Firebase API キー

---

## 💻 開発環境のセットアップ

### 前提条件
* Node.js (推奨バージョン)
* Docker
* Google Cloud SDK (`gcloud`)
* Firebase CLI (`npm install -g firebase-tools`)

### ローカルでの起動手順

1. **リポジトリのクローン**
   ```bash
   git clone [https://github.com/if-future-tech/ProtoTyping.git](https://github.com/if-future-tech/ProtoTyping.git)
   cd ProtoTyping

```

2. **バックエンドの起動 (Docker)**
```bash
cd backend
docker build -t typing-app .
docker run -p 8080:8080 typing-app

```



---

## 📜 ライセンス (AGPL-3.0)

本プロジェクトは **GNU Affero General Public License v3.0 (AGPL-3.0)** の下で公開されています。

* 本リポジトリのコードを変更してWebサービスやAPI（ネットワーク経由）として公開・提供する場合、**変更したソースコード全体を AGPL-3.0 ライセンスに基づいて開示・公開する義務**が発生します。
* 詳細については、同梱の `LICENSE` ファイル（または [GNU AGPLv3 公式ドキュメント](https://www.google.com/search?q=https://www.gnu.org/licenses/agpl-3.0.html)）を参照してください。

```

```
