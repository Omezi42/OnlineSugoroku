import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LogEntry } from '../../../types/game';
import { GlassCard } from '../../../components/ui/GlassCard';

interface ChatPanelProps {
  logs: LogEntry[];
  onSendMessage: (message: string) => void;
  localPlayerId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ logs, onSendMessage, localPlayerId }) => {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatLogs = logs.filter(log => log.type === 'chat').slice(-30);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLogs, isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="w-72 sm:w-80"
          >
            <GlassCard className="p-4 flex flex-col h-80 shadow-2xl border-purple-200/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-purple-500" />
                  チャットルーム
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  最新30件
                </span>
              </div>

              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto pr-1 space-y-2 mb-3 scrollbar-thin scrollbar-thumb-purple-200"
              >
                {chatLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                    メッセージがありません
                  </div>
                ) : (
                  chatLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: log.senderId === localPlayerId ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex flex-col ${log.senderId === localPlayerId ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 px-1">
                        <span className="text-[10px] font-bold text-slate-500">{log.senderName}</span>
                        <span className="text-[8px] text-slate-300">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div 
                        className={`max-w-[90%] px-3 py-2 rounded-2xl text-xs shadow-sm break-all ${
                          log.senderId === localPlayerId 
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                        }`}
                      >
                        {log.message}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <form onSubmit={handleSubmit} className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="メッセージを入力..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-400 outline-none transition-all pr-10"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center text-purple-500 hover:text-pink-500 disabled:text-slate-300 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded) setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
            isExpanded 
              ? 'bg-slate-800 text-white rotate-90' 
              : 'bg-white text-purple-600 hover:scale-110'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
          {!isExpanded && chatLogs.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
              {chatLogs.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
