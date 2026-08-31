/**
 * ランキング表示
 * GET /api/ranking を呼び出し、モーダルパネルに描画する。
 * API_BASE_URL / state は app.js で定義されたグローバルを利用するため、
 * index.html では app.js より後に読み込むこと。
 */

const rankingElements = {
  openBtn: document.getElementById('rankingBtn'),
  overlay: document.getElementById('rankingOverlay'),
  closeBtn: document.getElementById('rankingCloseBtn'),
  categorySelect: document.getElementById('rankingCategorySelect'),
  list: document.getElementById('rankingList'),
  status: document.getElementById('rankingStatus'),
};

const medalByRank = { 1: '🥇', 2: '🥈', 3: '🥉' };

function openRanking() {
  if (!rankingElements.overlay) return;
  rankingElements.overlay.classList.add('is-open');
  syncRankingCategoryOptions();
  loadRanking();
}

function closeRanking() {
  if (!rankingElements.overlay) return;
  rankingElements.overlay.classList.remove('is-open');
}

/**
 * メインのカテゴリ選択と同じ選択肢を、ランキング用フィルタにも複製する（初回のみ）。
 * カテゴリ一覧の取得は words.js（getCategories）に委譲し、データの持ち方には関与しない。
 */
function syncRankingCategoryOptions() {
  if (!rankingElements.categorySelect) return;
  if (rankingElements.categorySelect.dataset.filled === 'true') return;

  const categories = typeof getCategories === 'function' ? getCategories() : [];
  if (categories.length === 0) return; // 未取得ならパネルを開き直した時に再試行される

  const options = ['<option value="">すべてのカテゴリ</option>'].concat(
    categories.map(c => `<option value="${c.id}">${c.name}</option>`)
  );
  rankingElements.categorySelect.innerHTML = options.join('');
  rankingElements.categorySelect.dataset.filled = 'true';
}

async function loadRanking() {
  if (!rankingElements.list || !rankingElements.status) return;

  rankingElements.list.innerHTML = '';
  rankingElements.status.textContent = '読み込み中...';
  rankingElements.status.style.display = 'block';

  const category = rankingElements.categorySelect ? rankingElements.categorySelect.value : '';
  const query = category
    ? `?category=${encodeURIComponent(category)}&limit=10`
    : '?limit=10';

  try {
    const response = await fetch(`${API_BASE_URL}/api/ranking${query}`);
    const json = await response.json();

    if (!json.ok || !json.data || json.data.length === 0) {
      rankingElements.status.textContent = 'まだ記録がありません。最初のスコアを記録してみましょう！';
      return;
    }

    rankingElements.status.style.display = 'none';
    renderRankingList(json.data);
  } catch (e) {
    console.error('Failed to load ranking', e);
    rankingElements.status.textContent = 'ランキングの取得に失敗しました。時間をおいて再度お試しください。';
  }
}

function renderRankingList(rows) {
  // APIがdisplayNameを返すようになったのでそちらを優先表示する。
  // （プロフィール機能導入前の古いスコアなど、無い場合はAPI側でUID等にフォールバック済み）
  rankingElements.list.innerHTML = rows.map(row => {
    const medal = medalByRank[row.rank] || String(row.rank);
    const displayName = row.displayName || 'ゲスト';

    return `
      <li class="ranking-row ${row.rank <= 3 ? 'ranking-row-top' : ''}">
        <span class="ranking-rank">${medal}</span>
        <span class="ranking-user">${displayName}</span>
        <span class="ranking-wpm">${row.wpm}<small> WPM</small></span>
        <span class="ranking-accuracy">${row.accuracy}%</span>
      </li>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  if (rankingElements.openBtn) {
    rankingElements.openBtn.addEventListener('click', openRanking);
  }
  if (rankingElements.closeBtn) {
    rankingElements.closeBtn.addEventListener('click', closeRanking);
  }
  if (rankingElements.overlay) {
    rankingElements.overlay.addEventListener('click', (e) => {
      if (e.target === rankingElements.overlay) closeRanking();
    });
  }
  if (rankingElements.categorySelect) {
    rankingElements.categorySelect.addEventListener('change', loadRanking);
  }
});
