import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanup() {
  console.log('--- 盤面のクリーンアップを開始します ---');
  const boardsCol = collection(db, 'boards');
  const snapshot = await getDocs(boardsCol);
  
  let count = 0;
  for (const boardDoc of snapshot.docs) {
    const data = boardDoc.data();
    const name = data.name || '';
    
    // 削除対象の条件: 「テスト」を含む、または「無題」から始まる
    if (name.includes('テスト') || name.startsWith('無題') || name === '') {
      console.log(`削除中: ${name} (${boardDoc.id})`);
      await deleteDoc(doc(db, 'boards', boardDoc.id));
      count++;
    }
  }
  
  console.log(`--- 完了: ${count} 件の盤面を削除しました ---`);
  process.exit(0);
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
