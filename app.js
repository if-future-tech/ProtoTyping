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

function loadWords() {
  // 動作確認用のセット
  state.wordData = {
    categories: [
      { id: 'basic', words: ['apple', 'banana', 'orange', 'grape', 'lemon'] }
    ]
  };
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
  
  const total = scoreState.totalTyped || 0;
  const accuracy = total === 0 ? 0 : ((state.score.correct / total) * 100).toFixed(1);
  if (elements.accuracyValue) elements.accuracyValue.textContent = accuracy + '%';
}

function nextWord() {
  const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
  if (category) loadRandomWord(category.words);
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

function updateTimer() {
  const diff = Math.floor((Date.now() - state.uiStartTime) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  elements.timeValue.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

// --- 5. 初期化とイベント起動 ---

async function handleStart() {
  try {
    await requestStartSession(state.selectedCategory);
    state.isStarted = true;
    state.uiStartTime = Date.now();
    elements.typingInput.disabled = false;
    elements.typingInput.focus();
    
    state.timerInterval = setInterval(updateTimer, 1000);
    nextWord();
  } catch (e) {
    console.error(e);
    alert("通信エラー：GAEが起動しているか確認してください。");
  }
}

function initialize() {
  // イベント登録
  elements.startBtn.addEventListener('click', handleStart);
  elements.typingInput.addEventListener('input', handleInputChange);
  
  // firebase-auth.js の関数が存在する場合のみ登録
  if (elements.loginBtn && typeof login === 'function') {
    elements.loginBtn.addEventListener('click', login);
  }
  if (elements.logoutBtn && typeof logout === 'function') {
    elements.logoutBtn.addEventListener('click', logout);
  }

  // 初回描画
  try {
    loadWords();
    // keyboard.js の関数を安全に呼び出す
    if (typeof renderKeyboard === 'function') {
      renderKeyboard();
    }
    updateScoreDisplay();
  } catch (e) {
    console.error("初期描画エラー:", e);
  }
}

// 起動
window.addEventListener('DOMContentLoaded', initialize);