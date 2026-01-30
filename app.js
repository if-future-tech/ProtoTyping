// --- 1. 定数・状態管理 ---
const API_BASE_URL = 'https://typing-ec-wp.uw.r.appspot.com';

const state = {
  wordData: null,
  selectedCategory: 'basic',
  currentWord: '',
  inputValue: '',
  currentIndex: 0,
  score: { correct: 0, mistakes: 0 },
  uiStartTime: null,
  elapsedTime: 0,
  soundEnabled: true,
  bgmEnabled: false,
  pressedKey: '',
  isStarted: false,
  timerInterval: null
};

const appState = {
  status: 'idle',
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
  categorySelect: document.getElementById('categorySelect'),
  startBtn: document.getElementById('startBtn'),
  soundToggle: document.getElementById('soundToggle'),
  bgmToggle: document.getElementById('bgmToggle'),
  soundIcon: document.getElementById('soundIcon'),
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

async function requestStartSession(categoryId) {
  const token = await getIdToken(); // firebase-auth.js から取得
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/session/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ category: categoryId })
  });

  if (!response.ok) throw new Error('Failed to start session');
  const json = await response.json();
  appState.sessionId = json.data.sessionId;
  appState.startedAt = json.data.startedAt;
}

async function sendScoreResult() {
  const token = await getIdToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/score`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId: appState.sessionId,
      totalTyped: scoreState.totalTyped,
      missCount: scoreState.missCount,
      elapsedMs: Date.now() - new Date(appState.startedAt).getTime()
    })
  });

  const result = await response.json();
  scoreState.wpm = result.data.wpm;
  scoreState.accuracy = result.data.accuracy;
}
// --- 3. ゲームロジック ---

async function loadWords() {
  // 本来はJSONから読み込みますが、まずは動作確認用にダミーデータをセット
  state.wordData = {
    categories: [
      { id: 'basic', words: ['apple', 'banana', 'orange', 'grape', 'lemon'] }
    ]
  };
}

function loadRandomWord(words) {
  state.currentWord = words[Math.floor(Math.random() * words.length)];
  state.inputValue = '';
  state.currentIndex = 0;
  elements.typingInput.value = '';
  renderWordDisplay();
}

function renderWordDisplay() {
  elements.wordDisplay.innerHTML = state.currentWord.split('').map((char, i) => {
    let className = '';
    if (i < state.currentIndex) className = 'correct';
    return `<span class="${className}">${char}</span>`;
  }).join('');
}

function renderKeyboard() {
  // キーボード描画ロジック（簡易版）
  if (!elements.keyboard) return;
  const keys = 'qwertyuiopasdfghjklzxcvbnm';
  elements.keyboard.innerHTML = keys.split('').map(key => 
    `<div class="key ${state.pressedKey === key ? 'active' : ''}">${key.toUpperCase()}</div>`
  ).join('');
}

function updateScoreDisplay() {
  elements.correctValue.textContent = state.score.correct;
  elements.mistakesValue.textContent = state.score.mistakes;
}

function updateTimer() {
  const diff = Math.floor((Date.now() - state.uiStartTime) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  elements.timeValue.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function playErrorSound() {
  if (!state.soundEnabled) return;
  // Audio API 等で音を鳴らす処理（省略可）
}
// --- 4. イベントハンドラ・初期化 ---

async function handleStart() {
  try {
    await requestStartSession(state.selectedCategory);
    appState.status = 'running';
    elements.typingInput.disabled = false;
    state.uiStartTime = Date.now();
    state.score = { correct: 0, mistakes: 0 };
    scoreState.totalTyped = 0;
    scoreState.missCount = 0;
    
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(updateTimer, 1000);

    const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
    if (category) loadRandomWord(category.words);
    
    updateScoreDisplay();
    elements.typingInput.focus();
  } catch (e) {
    alert("セッション開始失敗。GAEが動いているか確認してください。");
  }
}

function initialize() {
  // 全てのボタンにイベントを紐付け
  elements.startBtn.addEventListener('click', handleStart);
  if (elements.loginBtn) elements.loginBtn.addEventListener('click', login);
  if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', logout);
  
  elements.typingInput.addEventListener('input', handleInputChange);
  elements.typingInput.addEventListener('keydown', (e) => { state.pressedKey = e.key; renderKeyboard(); });
  elements.typingInput.addEventListener('keyup', () => { state.pressedKey = ''; renderKeyboard(); });

  loadWords();
  renderKeyboard();
  updateScoreDisplay();
}

// HTML読み込み完了時に実行
window.addEventListener('DOMContentLoaded', initialize);
