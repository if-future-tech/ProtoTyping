/**
 * スコアの一時管理
 * ※ 最終確定は将来 PHP 側で行う
 */

let scoreState = {
  totalTyped: 0,
  missCount: 0,
  startedAt: null
};

/**
 * スコアを初期化
 */
function resetScore() {
  scoreState.totalTyped = 0;
  scoreState.missCount = 0;
  scoreState.startedAt = Date.now();
}

/**
 * スコア表示更新
 */
function renderScoreBoard() {
  // DOM更新処理を書く
}
