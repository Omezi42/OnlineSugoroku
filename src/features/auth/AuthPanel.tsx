import { useState } from 'react';
import { LogIn, LogOut, Mail, UserRound } from 'lucide-react';
import { createAccountWithEmail, continueAsGuest, signInWithEmail, signInWithGoogle, signOutCurrentUser } from '../../services/authService';
import { useAuthUser } from '../../hooks/useAuthUser';

export const AuthPanel = () => {
  const { user, isAuthLoading } = useAuthUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const run = async (task: () => Promise<unknown>, success: string) => {
    try {
      setIsBusy(true);
      setMessage('');
      await task();
      setMessage(success);
    } catch (error) {
      const text = error instanceof Error ? error.message : '認証に失敗しました。';
      setMessage(text);
    } finally {
      setIsBusy(false);
    }
  };

  if (isAuthLoading) {
    return <div className="text-xs text-slate-500">アカウント確認中...</div>;
  }

  if (user) {
    return (
      <div className="rounded-2xl bg-white/70 p-3 text-sm shadow-sm">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <UserRound className="h-4 w-4 text-purple-500" />
          <span className="truncate">{user.isAnonymous ? 'ゲストで利用中' : user.displayName || user.email || 'ログイン中'}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {user.isAnonymous ? 'この端末のローカル所有者として保存できます。' : '自分の盤面一覧と編集権限が有効です。'}
        </p>
        <button
          onClick={() => run(signOutCurrentUser, 'ログアウトしました。')}
          className="mt-2 inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
      <div className="grid gap-2">
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="表示名"
          className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300"
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="メールアドレス"
          className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="パスワード"
          className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          disabled={isBusy || !email || !password}
          onClick={() => run(() => signInWithEmail(email, password), 'ログインしました。')}
          className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          ログイン
        </button>
        <button
          disabled={isBusy || !email || !password}
          onClick={() => run(() => createAccountWithEmail(email, password, displayName), 'アカウントを作成しました。')}
          className="rounded-xl bg-pink-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          新規登録
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          disabled={isBusy}
          onClick={() => run(signInWithGoogle, 'Googleでログインしました。')}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700"
        >
          <Mail className="h-3.5 w-3.5" />
          Google
        </button>
        <button
          disabled={isBusy}
          onClick={() => run(continueAsGuest, 'ゲストで開始しました。')}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700"
        >
          <LogIn className="h-3.5 w-3.5" />
          ゲスト
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-slate-500">{message}</p>}
    </div>
  );
};
