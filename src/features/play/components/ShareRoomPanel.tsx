import { useState } from 'react';
import { Check, Copy, QrCode } from 'lucide-react';

interface ShareRoomPanelProps {
  roomId: string;
}

export const ShareRoomPanel = ({ roomId }: ShareRoomPanelProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-2xl bg-white/60 border border-white/70 p-4">
      <div className="flex items-center gap-2 mb-3">
        <QrCode className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-bold text-slate-800">ルーム共有</h3>
      </div>
      <div className="flex gap-3">
        <img src={qrUrl} alt="参加用QRコード" className="w-24 h-24 rounded-xl bg-white p-1 shadow-sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 mb-1">ルームID</p>
          <code className="block truncate rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{roomId}</code>
          <button
            onClick={handleCopy}
            className="mt-3 w-full rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'コピー済み' : '参加URLをコピー'}
          </button>
        </div>
      </div>
    </div>
  );
};
