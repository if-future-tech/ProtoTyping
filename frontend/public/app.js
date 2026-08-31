// --- 1. 定数とアプリの状態管理 ---
const API_BASE_URL = 'https://typing-backend-7k6v4z4fxa-an.a.run.app';
// https://typing-ec-wp.uw.r.appspot.com

const state = {
  selectedCategory: 'basic',
  currentWord: '',
  inputValue: '',
  currentIndex: 0,
  completedWords: 0, // 完了した単語数
  score: { correct: 0, mistakes: 0 },
  uiStartTime: null,
  isStarted: false,
  timerInterval: null,
  pressedKey: '',
};

const appState = {
  sessionId: null,
  startedAt: null
};

const scoreState = {
  totalTyped: 0,
  missCount: 0,
  wpm: 0,
  accuracy: 0
};

const elements = {
  seasonalCanvas: document.getElementById('seasonalCanvas'),
  categorySelect: document.getElementById('categorySelect'),
  startBtn: document.getElementById('startBtn'),
  timeValue: document.getElementById('timeValue'),
  correctValue: document.getElementById('correctValue'),
  mistakesValue: document.getElementById('mistakesValue'),
  accuracyValue: document.getElementById('accuracyValue'),
  wpmValue: document.getElementById('wpmValue'),
  wordDisplay: document.getElementById('wordDisplay'),
  typingInput: document.getElementById('typingInput'),
  keyboard: document.getElementById('keyboard'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn')
};

// --- 2. API 通信関数 ---

/**
 * 出題データを読み込み、カテゴリ選択肢を描画する。
 * データそのものの取得・保持は words.js（loadWordData / getCategories）に委譲する。
 */
async function fetchWordData() {
  try {
    await loadWordData(); // words.js

    if (elements.categorySelect) {
      elements.categorySelect.innerHTML = getCategories().map(c =>
        `<option value="${c.id}">${c.name}</option>`
      ).join('');
    }
  } catch (e) {
    console.error("Failed to load words.json", e);
  }
}

async function requestStartSession(categoryId) {
  const token = await getIdToken(); // firebase-auth.js の関数を利用
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`; //

  const response = await fetch(`${API_BASE_URL}/api/session/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ category: categoryId })
  });

  if (!response.ok) throw new Error('Session start failed');
  const json = await response.json();
  // サーバーから返された公式なセッション情報を保持
  appState.sessionId = json.data.sessionId; //
  appState.startedAt = json.data.startedAt; //
}

async function sendScoreResult() {
  const token = await getIdToken();
  
  // サーバー時刻との差分をミリ秒で算出（設計図 4.1 との同期）
  const startTime = new Date(appState.startedAt).getTime();
  const elapsedMs = Date.now() - startTime;

  const response = await fetch(`${API_BASE_URL}/api/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      sessionId: appState.sessionId,
      totalTyped: scoreState.totalTyped,
      missCount: scoreState.missCount,
      elapsedMs: elapsedMs // サーバー側で WPM 計算に使用
    })
  });
  
  const result = await response.json();
  if (result.ok) {
    scoreState.wpm = result.data.wpm; 
    scoreState.accuracy = result.data.accuracy;
  }
}

// --- 3. 入力判定ロジック ---
function handleInputChange(e) {
  if (!state.isStarted) return;
  
  const val = e.target.value;
  if (!val) return;
  
  const targetChar = state.currentWord[state.currentIndex];
  const lastChar = val.slice(-1);
  
  // 押下されたキーを一時的に記録
  state.pressedKey = lastChar;

  if (lastChar === targetChar) {
    state.currentIndex++;
    state.score.correct++;
    scoreState.totalTyped++;
    e.target.value = ''; 
  } else {
    state.score.mistakes++;
    scoreState.missCount++;
    scoreState.totalTyped++;
    e.target.value = '';
  }

  // 判定が終わってから（currentIndexが更新されてから）描画
  renderWordDisplay();
  updateScoreDisplay();
  if (typeof renderKeyboard === 'function') renderKeyboard();

  // 押下ハイライトを少し後に消す（視覚効果）
  setTimeout(() => {
    state.pressedKey = '';
    if (typeof renderKeyboard === 'function') renderKeyboard();
  }, 100);

  // 単語が終了したか判定
  if (state.currentIndex >= state.currentWord.length) {
    state.completedWords++;
    if (state.completedWords >= 10) {
      finishGame();
    } else {
      setTimeout(() => {
        nextWord();
        e.target.value = '';
      }, 100);
    }
  }
}
// --- 4. 描画と進行管理 ---

/**
 * 現在の出題単語を差し替え、入力状態をリセットする。
 * 単語の「選定」は words.js の getRandomWord に任せ、
 * ここでは選ばれた単語を画面状態に反映するだけに専念する。
 */
function setCurrentWord(word) {
  state.currentWord = word;
  state.currentIndex = 0;
  state.inputValue = '';
  elements.typingInput.value = '';
  renderWordDisplay();
}

function renderWordDisplay() {
  if (!elements.wordDisplay) return;
  if (!state.isStarted) {
    elements.wordDisplay.innerHTML = '<span class="prompt-text">スタートボタンを押してください</span>';
    return;
  }
  elements.wordDisplay.innerHTML = state.currentWord.split('').map((char, i) => {
    let className = i < state.currentIndex ? 'correct' : '';
    const displayChar = char === ' ' ? '&nbsp;' : char;
    return `<span class="${className}">${displayChar}</span>`;
  }).join('');
}

function updateScoreDisplay() {
  if (elements.correctValue) elements.correctValue.textContent = state.score.correct;
  if (elements.mistakesValue) elements.mistakesValue.textContent = state.score.mistakes;
  
  const total = scoreState.totalTyped || 0;
  const accuracy = total === 0 ? 0 : ((state.score.correct / total) * 100).toFixed(1);
  if (elements.accuracyValue) elements.accuracyValue.textContent = accuracy + '%';
}

function nextWord() {
  // カテゴリからどの単語を出すかは words.js の責務
  const word = getRandomWord(state.selectedCategory);
  if (word) {
    setCurrentWord(word);
    if (typeof renderKeyboard === 'function') renderKeyboard();
  }
}

async function finishGame() {
  clearInterval(state.timerInterval);
  elements.typingInput.disabled = true;
  try {
    await sendScoreResult();
    if (elements.wpmValue) elements.wpmValue.textContent = scoreState.wpm;
    if (elements.accuracyValue) elements.accuracyValue.textContent = scoreState.accuracy + '%';
    
    setTimeout(() => {
      alert(`終了！ WPM: ${scoreState.wpm}, 精度: ${scoreState.accuracy}%`);
    }, 100);
  } catch (e) {
    console.error("Score send failed", e);
  }
}

function updateTimer() {
  const diff = Math.floor((Date.now() - state.uiStartTime) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  elements.timeValue.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

// --- 5. 初期化 ---

// 指定ミリ秒待機するヘルパー
const wait = (ms) => new Promise(resolve => setTimeout(ms ? resolve : null, ms));

async function handleStart() {
  state.selectedCategory = elements.categorySelect.value;
  
  try {
    // 1. API へのリクエスト（並行してカウントダウンの準備）
    await requestStartSession(state.selectedCategory);
    
    // 2. カウントダウン演出
    state.isStarted = true; // 描画のために一時的にtrueにするが入力は無効
    elements.typingInput.disabled = true;
    
    // 赤: ×××
    elements.wordDisplay.innerHTML = '<span class="countdown-symbol symbol-red">×××</span>';
    await wait(800);
    
    // 黄: △▽
    elements.wordDisplay.innerHTML = '<span class="countdown-symbol symbol-yellow">△▽</span>';
    await wait(800);
    
    // 緑: ◎
    elements.wordDisplay.innerHTML = '<span class="countdown-symbol symbol-green">◎</span>';
    await wait(800);

    // 3. ゲーム正式開始
    state.score = { correct: 0, mistakes: 0 };
    state.completedWords = 0;
    scoreState.totalTyped = 0;
    scoreState.missCount = 0;
    state.uiStartTime = Date.now();
    
    elements.typingInput.disabled = false;
    elements.typingInput.value = '';
    elements.typingInput.focus();
    
    state.timerInterval = setInterval(updateTimer, 1000);
    nextWord();
    updateScoreDisplay();
    
  } catch (e) {
    console.error(e);
    alert("通信エラー：GAEが起動しているか確認してください。");
  }
}

async function initialize() {
  await fetchWordData();
  
  elements.startBtn.addEventListener('click', handleStart);
  elements.typingInput.addEventListener('input', handleInputChange);
  
  elements.typingInput.disabled = true;

  elements.categorySelect.addEventListener('change', (e) => {
    state.selectedCategory = e.target.value;
    state.isStarted = false;
    if (state.timerInterval) clearInterval(state.timerInterval);
    elements.typingInput.disabled = true;
    elements.typingInput.value = '';
    renderWordDisplay();
  });
  
  if (elements.loginBtn && typeof login === 'function') {
    elements.loginBtn.addEventListener('click', login);
  }
  if (elements.logoutBtn && typeof logout === 'function') {
    elements.logoutBtn.addEventListener('click', logout);
  }
  
  // 3. 初回描画
  state.isStarted = false;
  renderWordDisplay();
  
  if (typeof initSeasonalEffect === 'function') {
    initSeasonalEffect(); // エフェクトの開始
  }
  
  if (typeof renderKeyboard === 'function') {
    renderKeyboard(); 
  }
  updateScoreDisplay();
}

window.addEventListener('DOMContentLoaded', initialize);
