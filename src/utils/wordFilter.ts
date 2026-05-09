/**
 * 不適切なコンテンツをフィルタリングするためのユーティリティ
 */

// 注: 実際の運用ではより包括的なリストが必要ですが、ここでは一般的なパターンを例示します。
const NG_PATTERNS = [
  // 誹謗中傷・攻撃的表現
  /[死し][ねね]/,
  /[殺ころ]す/,
  /バカ|ばか|馬鹿/,
  /クズ|くず/,
  // 差別・ヘイトスピーチ関連のパターン (例示)
  /差別|ヘイト/,
  // 性的・露骨な表現のパターン
  /[エえ][ロろ]/,
  /セフレ/,
  // 詐欺・スパム関連
  /稼げる|副業|当選/,
];

export interface FilterResult {
  hasNgWord: boolean;
  detectedWords: string[];
}

/**
 * テキストにNGワードが含まれているかチェックする
 */
export const checkText = (text: string): FilterResult => {
  const detectedWords: string[] = [];
  
  if (!text) return { hasNgWord: false, detectedWords };

  NG_PATTERNS.forEach(pattern => {
    const match = text.match(pattern);
    if (match) {
      detectedWords.push(match[0]);
    }
  });

  return {
    hasNgWord: detectedWords.length > 0,
    detectedWords: Array.from(new Set(detectedWords)),
  };
};

/**
 * 盤面データ全体をスキャンしてNGワードをチェックする
 */
export const checkBoardContent = (board: {
  name: string;
  description?: string;
  nodes: any[];
}): FilterResult => {
  const allText: string[] = [board.name, board.description || ''];
  
  board.nodes.forEach(node => {
    allText.push(node.data?.label || '');
    allText.push(node.data?.description || '');
  });

  const combinedText = allText.join(' ');
  return checkText(combinedText);
};
