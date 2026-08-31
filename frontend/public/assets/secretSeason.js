/**
 * 隠しコマンド: 季節演出を手動で切り替える
 *
 * ページ上のどこかで（入力欄にフォーカスがあっても無くても）
 * "@" + コードワード をタイプすると、背景の季節演出（seasonalEffect.js）が
 * 即座に切り替わる。SNSのメンション記法を模して "@" を前置させることで、
 * 通常のタイピング練習中の入力と偶然一致してしまうリスクをほぼ無くしている
 * （単語をまたいで偶然 "sakura" 等のスペルが繋がってしまう事故を防ぐため）。
 *
 *   @sakura → 春（桜）
 *   @hotaru → 夏（蛍）
 *   @momiji → 秋（紅葉）
 *   @yuki   → 冬（雪）
 */

const SECRET_SEASON_CODES = {
  '@sakura': 'spring',
  '@hotaru': 'summer',
  '@momiji': 'autumn',
  '@yuki': 'winter',
};

// 最長のコードワード( "@sakura" 等 = 7文字)分だけ直近のキー入力を保持すれば十分
const SECRET_BUFFER_MAX_LENGTH = 8;

let secretSeasonBuffer = '';

function handleSecretSeasonKey(e) {
  // 修飾キー付き入力（Ctrl+V等）は誤爆防止のため無視
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  // アルファベットと "@" 以外はバッファに積まない（他のキーは単に無視して素通りさせる）
  if (!/^[a-zA-Z@]$/.test(e.key)) return;

  secretSeasonBuffer = (secretSeasonBuffer + e.key.toLowerCase()).slice(-SECRET_BUFFER_MAX_LENGTH);

  for (const [code, season] of Object.entries(SECRET_SEASON_CODES)) {
    if (secretSeasonBuffer.endsWith(code)) {
      if (typeof setSeason === 'function') {
        setSeason(season);
      }
      secretSeasonBuffer = '';
      break;
    }
  }
}

document.addEventListener('keydown', handleSecretSeasonKey);

console.log(
  '%c🌸 隠しコマンド: @sakura / @hotaru / @momiji / @yuki と入力すると季節演出が切り替わります 🌸',
  'color:#4f46e5;font-weight:bold;'
);
