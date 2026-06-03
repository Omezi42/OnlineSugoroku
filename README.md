# OnlineSugoroku | オンラインカスタムすごろくメーカー

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**"Create your own original board game and play with everyone via a single URL."**  
**「オリジナルのボードゲームを作って、URLひとつでみんなと遊ぼう。」**

OnlineSugoroku is a web-based board game editor and multiplayer platform designed for friends, families, clubs, and online communities to co-create and play custom board games (similar to Sugoroku / Game of Life) directly in the browser. 

---

## 🌟 Features / 主な機能

### 🛠️ Base-Node Editor / 盤面エディター
- **Visual Node-based Editor**: Powered by **React Flow (xyflow)**, allowing users to connect nodes (board spaces) with edges (paths) intuitively.
- **Customizable Nodes**: Set title, description, node type (Start, Goal, Plus, Minus, Stop, Neutral), colors, custom background images (Base64), and size.
- **12+ Event Actions**: Mix and match multiple actions per space:
  1. Parameter Adjustment (e.g., Gold, HP)
  2. Move Forward N spaces
  3. Move Backward N spaces
  4. Skip Turn (Rest)
  5. Roll Dice to Move
  6. Roll Dice for Parameter Change
  7. Goal Rank Bonus
  8. Warp to another space
  9. Conditional Branching (e.g., "If Gold >= 500")
  10. Random Branching (e.g., "50% chance to go right")
  11. Steal parameter from other players
  12. Built-in Mini-games: *Dice Battle (High & Low)*, *Rock-Paper-Scissors*, *Cho-Han (Odd/Even)*

### 🎮 Multiplayer & Sync / マルチプレイ・リアルタイム同期
- **Firebase Firestore Integration**: Real-time synchronization of board creation and live game state.
- **Join via Link**: Play with friends instantly by simply sharing the game room URL.
- **Real-time Collaboration**: Multiple creators can build and modify the board together simultaneously.

### ✨ Visuals & UX / ビジュアル・演出
- **Glassmorphism Design**: Sleek, transparent UI with vibrant neon gradients.
- **Micro-interactions**: High-fidelity animations powered by **Framer Motion** for rolling dice, moving player tokens, and dynamic event popups.

---

## 🛠️ Tech Stack / 技術スタック

- **Frontend Core**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS v4, Vanilla CSS
- **State Management**: Zustand 5
- **Interactive Board**: React Flow (xyflow) v12
- **Animation**: Framer Motion 12
- **Icons**: Lucide React
- **Backend / Real-time Sync**: Firebase v12 (Firestore)

---

## 🚀 Quick Start / 開発の始め方

### 1. Installation / 依存関係のインストール
```bash
git clone https://github.com/Omezi42/OnlineSugoroku.git
cd OnlineSugoroku
npm install
```

### 2. Configure Firebase / Firebaseの設定
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Run Development Server / 開発サーバーの起動
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📄 License / ライセンス

This project is licensed under the MIT License. See the [LICENSE](file:///C:/Users/omezi/Documents/GitHub/OnlineSugoroku/LICENSE) file for details.
