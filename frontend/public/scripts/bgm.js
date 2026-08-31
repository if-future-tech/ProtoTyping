/**
 * BGM再生のON/OFF切り替え
 *
 * 仕様:
 * - 初回訪問時（保存された状態が無い場合）はOFFから開始する
 * - 一度ON/OFFを切り替えた後は、その状態を localStorage に保存し、
 *   リロード時にはその状態を引き継ぐ（ONのままリロードしたらONで復帰する）
 * - ブラウザの自動再生ポリシー対策: リロード直後の自動再生はブロックされることが
 *   あるため、失敗した場合は最初のユーザー操作（クリック/キー入力）を検知して
 *   再試行する
 *
 * 効果音のON/OFF切り替え機能は実装しない（BGMのみ）。
 */

const BGM_STORAGE_KEY = 'bgmEnabled';

const bgmAudio = new Audio('assets/bgm.mp3');
bgmAudio.loop = true;
bgmAudio.volume = 0.4;

function isBgmEnabled() {
  return localStorage.getItem(BGM_STORAGE_KEY) === 'true';
}

function setBgmEnabled(enabled) {
  localStorage.setItem(BGM_STORAGE_KEY, enabled ? 'true' : 'false');
}

function updateBgmIcon(enabled) {
  const btn = document.getElementById('bgmToggle');
  if (btn) {
    btn.classList.toggle('active', enabled);
    btn.title = enabled ? 'BGM ON' : 'BGM OFF';
  }
}

function playBgm() {
  // 自動再生がブロックされる環境では Promise が reject されるだけなので、
  // ここでは静かに無視する（resumeBgmOnInteraction側で再試行される）。
  bgmAudio.play().catch(() => {});
}

function pauseBgm() {
  bgmAudio.pause();
}

/**
 * ユーザーがトグルボタンを押した時の処理。
 * ボタン押下自体がユーザー操作なので、通常はここでの再生開始はブロックされない。
 */
function toggleBgm() {
  const nextEnabled = !isBgmEnabled();
  setBgmEnabled(nextEnabled);
  updateBgmIcon(nextEnabled);

  if (nextEnabled) {
    playBgm();
  } else {
    pauseBgm();
  }
}

/**
 * リロード直後、保存状態がONだった場合の自動再生を試みる。
 * ブラウザにブロックされた場合は、ページ上の最初のクリック/キー入力を
 * トリガーに再生を再試行する（アイコン自体は最初からON表示にしておく）。
 */
function resumeBgmIfEnabled() {
  if (!isBgmEnabled()) return;

  updateBgmIcon(true);
  playBgm();

  const retryOnInteraction = () => {
    if (isBgmEnabled() && bgmAudio.paused) {
      playBgm();
    }
  };
  document.addEventListener('click', retryOnInteraction, { once: true });
  document.addEventListener('keydown', retryOnInteraction, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('bgmToggle');
  if (btn) {
    btn.addEventListener('click', toggleBgm);
  }

  // 初回訪問（未保存）はOFFのまま。リロード時は保存済みの状態を引き継ぐ。
  updateBgmIcon(isBgmEnabled());
  resumeBgmIfEnabled();
});
