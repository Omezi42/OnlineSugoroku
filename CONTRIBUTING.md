# Contributing to OnlineSugoroku / 開発への参加方法

Thank you for your interest in contributing to **OnlineSugoroku** (オンラインカスタムすごろくメーカー)!  
このプロジェクトに関心を持っていただき、ありがとうございます。本リポジトリへの貢献方法についてのガイドラインです。

---

## 🛠️ Local Development Setup / ローカル開発環境の構築

This project is built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Firebase**.  
本プロジェクトは React, TypeScript, Vite, Tailwind CSS, Firebase を使用して構築されています。

### Prerequisites / 前提条件
- Node.js (v18 or higher recommended)
- npm or yarn

### Setup Steps / セットアップ手順

1. **Fork and Clone the repository / リポジトリのフォークとクローン**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OnlineSugoroku.git
   cd OnlineSugoroku
   ```

2. **Install dependencies / 依存関係のインストール**
   ```bash
   npm install
   ```

3. **Configure Environment Variables / 環境変数の設定**
   Create a `.env` file in the root directory (based on `.env.example` if available, or using your Firebase configuration):
   ルートディレクトリに `.env` ファイルを作成し、必要なFirebase設定等を入力します。
   ```env
   # Example variables (replace with your Firebase config)
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the Development Server / 開発サーバーの起動**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Linting and Formatting / コードチェック**
   Before submitting changes, please ensure that there are no linting errors:
   プルリクエストを送信する前に、以下のコマンドで静的解析を確認してください。
   ```bash
   npm run lint
   ```

---

## 🤝 How to Contribute / コントリビューションの流れ

1. **Find or Create an Issue / 課題の確認・作成**
   - Check the issue tracker first to see if the bug or feature is already discussed.
   - 変更を加える前に、既存のIssueを確認するか、新しくIssueを作成して議論してください。

2. **Create a Branch / ブランチの作成**
   - Create a feature branch with a descriptive name:
     ```bash
     git checkout -b feature/your-feature-name
     # or
     git checkout -b fix/bug-description
     ```

3. **Commit your changes / コミットの作成**
   - Keep commits focused and write descriptive commit messages in English or Japanese.
   - コミットメッセージは簡潔かつ明確に記述してください。

4. **Push and Open a Pull Request / プルリクエストの送信**
   - Push your branch to your forked repository and open a Pull Request (PR) against the `main` branch.
   - 自身のフォークにプッシュし、本家の `main` ブランチに対してPRを作成してください。
   - Describe what changed and link any related issues.

---

## 📜 Code of Conduct / 行動規範
We aim to foster a welcoming, inclusive, and collaborative environment. Please respect all developers and contributors.  
誰もが気持ちよく参加できるよう、お互いに敬意を払ったコミュニケーションを心がけてください。

Thank you! / よろしくお願いいたします！
