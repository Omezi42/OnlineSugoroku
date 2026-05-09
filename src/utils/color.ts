/**
 * 背景色に基づいて最適な文字色（黒または白）を返します。
 * @param hex 背景色の16進数コード
 * @returns 'text-white' または 'text-slate-900'
 */
export const getContrastColor = (hex?: string): string => {
  if (!hex) return 'text-white';
  
  // HEXをRGBに変換
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  // 輝度の計算 (ITU-R BT.709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.5 ? 'text-slate-900' : 'text-white';
};
