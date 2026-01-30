// --- 1. 定数とアプリの状態管理 ---
const API_BASE_URL = 'https://typing-ec-wp.uw.r.appspot.com'; //

const state = {
  wordData: null,
  selectedCategory: 'basic',
  currentWord: '',
  inputValue: '',
  currentIndex: 0,
  score: { correct: 0, mistakes: 0 },
  uiStartTime: null,
  isStarted: false,
  timerInterval: null
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
  categorySelect: document.getElementById('categorySelect'),
  startBtn: document.getElementById('startBtn'),
  timeValue: document.getElementById('timeValue'),
  correctValue: document.getElementById('correctValue'),
  mistakesValue: document.getElementById('mistakesValue'),
  wordDisplay: document.getElementById('wordDisplay'),
  typingInput: document.getElementById('typingInput'),
  keyboard: document.getElementById('keyboard'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn')
};

// --- 2. API 通信関数 ---
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
  appState.sessionId = json.data.sessionId; //
  appState.startedAt = json.data.startedAt; //
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
  scoreState.wpm = result.data.wpm; //
  scoreState.accuracy = result.data.accuracy; //
}
// --- 3. 入力判定ロジック ---
function handleInputChange(e) {
  if (!appState.sessionId) {
    alert('スタートボタンを押してください！');
    e.target.value = '';
    return;
  }

  const newValue = e.target.value;
  
  // 1文字追加された場合（入力時）
  if (newValue.length > state.inputValue.length) {
    const lastChar = newValue[newValue.length - 1];
    const expectedChar = state.currentWord[state.currentIndex];

    if (lastChar === expectedChar) {
      // 正解
      scoreState.totalTyped++;
      state.score.correct++;
      state.currentIndex++;
      state.inputValue = newValue;
    } else {
      // ミス
      scoreState.missCount++;
      state.score.mistakes++;
      e.target.value = state.inputValue; // 入力を戻す
    }
  } else {
    // 削除（BackSpace）
    state.inputValue = newValue;
    state.currentIndex = newValue.length;
  }

  renderWordDisplay();
  updateScoreDisplay();

  // 単語を打ち切ったか確認
  if (state.inputValue === state.currentWord) {
    if (state.score.correct >= 10) {
      finishGame();
    } else {
      setTimeout(nextWord, 200);
    }
  }
}
// --- 4. 描画と進行管理 ---
unction loadWords() {
  // 本来は外部JSONから取得。動作確認用にセット
  state.wordData = {
    categories: [
      { id: 'basic', words: ['apple', 'banana', 'orange', 'grape', 'lemon'] }
    ]
  };
  // 最初の単語をセット
  const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
  if (category) loadRandomWord(category.words);
}

function loadRandomWord(words) {
  state.currentWord = words[Math.floor(Math.random() * words.length)];
  state.currentIndex = 0;
  state.inputValue = '';
  elements.typingInput.value = '';
  renderWordDisplay();
}

function renderWordDisplay() {
  if (!elements.wordDisplay) return;
  elements.wordDisplay.innerHTML = state.currentWord.split('').map((char, i) => {
    let className = i < state.currentIndex ? 'correct' : '';
    return `<span class="${className}">${char}</span>`;
  }).join('');
}

function updateScoreDisplay() {
  if (elements.correctValue) elements.correctValue.textContent = state.score.correct;
  if (elements.mistakesValue) elements.mistakesValue.textContent = state.score.mistakes;
  
  // 精度計算を追加
  const total = scoreState.totalTyped || 0;
  const accuracy = total === 0 ? 0 : ((state.score.correct / total) * 100).toFixed(1);
  if (elements.accuracyValue) elements.accuracyValue.textContent = accuracy + '%';
}

function nextWord() {
  const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
  state.currentWord = category.words[Math.floor(Math.random() * category.words.length)];
  state.inputValue = '';
  state.currentIndex = 0;
  elements.typingInput.value = '';
  renderWordDisplay();
}

async function finishGame() {
  clearInterval(state.timerInterval);
  elements.typingInput.disabled = true;
  try {
    await sendScoreResult();
    alert(`終了！ WPM: ${scoreState.wpm}, 精度: ${scoreState.accuracy}%`);
  } catch (e) {
    console.error("Score send failed", e);
  }
}
// タイマー更新関数（setIntervalから呼ばれる）
function updateTimer() {
  const diff = Math.floor((Date.now() - state.uiStartTime) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  elements.timeValue.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 音を鳴らすなどの補助関数
function playErrorSound() { if (state.soundEnabled) console.log("Beep!"); }
function toggleBGM(enabled) { console.log("BGM:", enabled); }

// 最後に実行される初期化
async function initialize() {
  try {
    loadWords();
    renderKeyboard(); // keyboard.js が正しく読み込まれていれば実行される
    updateScoreDisplay();
  } catch (e) {
    console.error("Initialization failed:", e);
  }
}

// 実行
initialize();
// --- 5. 初期化と起動 ---
async function handleStart() {
  try {
    await requestStartSession(state.selectedCategory);
    state.isStarted = true;
    state.uiStartTime = Date.now();
    elements.typingInput.disabled = false;
    elements.typingInput.focus();
    
    state.timerInterval = setInterval(() => {
      const sec = Math.floor((Date.now() - state.uiStartTime) / 1000);
      elements.timeValue.textContent = `${Math.floor(sec/60)}:${(sec%60).toString().padStart(2,'0')}`;
    }, 1000);

    nextWord();
  } catch (e) {
    alert("通信エラー：GAEが起動しているか確認してください。");
  }
}

function initialize() {
  // データの準備
  state.wordData = { categories: [{ id: 'basic', words: ['apple', 'orange', 'banana'] }] };
  
  // イベント登録
  elements.startBtn.addEventListener('click', handleStart);
  elements.typingInput.addEventListener('input', handleInputChange);
  if (elements.loginBtn) elements.loginBtn.addEventListener('click', login); // firebase-auth.js
  if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', logout);
  
  renderWordDisplay();

  } catch (e) {
    alert("ログイン状態を確認するか、GAEの起動を待ってください。");
  }
}

function initialize() {
  // イベント登録
  elements.startBtn.addEventListener('click', handleStart);
  elements.typingInput.addEventListener('input', handleInputChange);
  if (elements.loginBtn) elements.loginBtn.addEventListener('click', login);
  if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', logout);

  // 起動時の描画（ここが重要！）
  try {
    loadWords();
    if (typeof renderKeyboard === 'function') {
      renderKeyboard(); // これでキーボードが復活します
    }
    updateScoreDisplay();
  } catch (e) {
    console.error("初期描画エラー:", e);
  }
}

// 起動
window.addEventListener('DOMContentLoaded', initialize);
