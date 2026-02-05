/**
 * app.js
 * * メインロジック：タイピングの進行管理、UI制御
 */

// --- 1. 定数と状態管理 ---
const API_BASE_URL = 'https://typing-ec-wp.uw.r.appspot.com';

const state = {
  wordData: null,
  selectedCategory: 'basic',
  currentWord: '',
  inputValue: '',
  currentIndex: 0,
  score: { correct: 0, mistakes: 0 },
  startTime: null,
  elapsedTime: 0,
  pressedKey: '',
  isStarted: false,
  isWaitingRestart: false, // ゲーム終了後のリスタート待機状態
  timerInterval: null,
  
  // ゲーム終了条件
  wordsPerSession: 10,
  completedWords: 0,
  
  // API連携用
  sessionId: null,
  sessionStartedAt: null,
  totalTyped: 0,
  missCount: 0
};

// サウンド機能 (scripts/sounds.js等で定義されたSoundManagerを利用)
const sounds = new SoundManager();

// DOM Elements
const elements = {
  categorySelect: document.getElementById('categorySelect'),
  startBtn: document.getElementById('startBtn'),
  soundToggle: document.getElementById('soundToggle'),
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
async function getIdToken() {
  if (window.auth && window.auth.currentUser) {
    return window.auth.currentUser.getIdToken();
  }
  return null;
}

async function requestStartSession(categoryId) {
  const token = await getIdToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/session/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ category: categoryId })
  });

  if (!response.ok) throw new Error('Session start failed');
  const json = await response.json();
  
  state.sessionId = json.data.sessionId;
  state.sessionStartedAt = json.data.startedAt;
}

async function sendScoreResult() {
  const token = await getIdToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const elapsedMs = Date.now() - new Date(state.sessionStartedAt).getTime();

  const response = await fetch(`${API_BASE_URL}/api/score`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId: state.sessionId,
      totalTyped: state.totalTyped,
      missCount: state.missCount,
      elapsedMs: elapsedMs
    })
  });

  if (!response.ok) throw new Error('Score submission failed');
  const result = await response.json();
  return result.data;
}

// --- 3. ロジック関数 ---

async function loadWords() {
  try {
    const response = await fetch('words.json');
    const data = await response.json();
    state.wordData = data;
    
    if (elements.categorySelect) {
      elements.categorySelect.innerHTML = '';
      data.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        elements.categorySelect.appendChild(option);
      });
      if (data.categories.length > 0) {
        state.selectedCategory = data.categories[0].id;
      }
    }
  } catch (error) {
    console.error('Failed to load words.json:', error);
    state.wordData = { categories: [{ id: 'basic', words: ['error'] }] };
  }
}

function loadNextWord() {
  if (!state.wordData) return;
  const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
  if (!category || !category.words) return;
  
  const randomWord = category.words[Math.floor(Math.random() * category.words.length)];
  state.currentWord = randomWord;
  state.inputValue = '';
  state.currentIndex = 0;
  
  if (elements.typingInput) elements.typingInput.value = '';
  
  elements.wordDisplay.classList.add('animate');
  setTimeout(() => elements.wordDisplay.classList.remove('animate'), 600);

  renderWordDisplay();
  refreshKeyboard();
}

function renderWordDisplay() {
  elements.wordDisplay.innerHTML = '';
  state.currentWord.split('').forEach((char, idx) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '␣' : char;
    
    if (idx < state.currentIndex) {
      span.className = 'char-correct';
    } else if (idx === state.currentIndex) {
      span.className = 'char-current';
    } else {
      span.className = 'char-pending';
    }
    elements.wordDisplay.appendChild(span);
  });
}

function refreshKeyboard() {
  if (window.KeyboardManager) {
    window.KeyboardManager.render(
      'keyboard', 
      state.pressedKey, 
      state.currentWord, 
      state.currentIndex
    );
  }
}

function updateScoreDisplay(serverResult = null) {
  if (serverResult) {
    if (elements.wpmValue) elements.wpmValue.textContent = serverResult.wpm;
    if (elements.accuracyValue) elements.accuracyValue.textContent = serverResult.accuracy + '%';
    return;
  }

  const totalKeystrokes = state.score.correct + state.score.mistakes;
  const accuracy = totalKeystrokes > 0 
    ? ((state.score.correct / totalKeystrokes) * 100).toFixed(1) 
    : '0.0';
  
  const timeInMinutes = state.elapsedTime / 60;
  const wpm = timeInMinutes > 0 ? Math.round((state.score.correct / 5) / timeInMinutes) : 0;
  
  if (elements.correctValue) elements.correctValue.textContent = state.score.correct;
  if (elements.mistakesValue) elements.mistakesValue.textContent = state.score.mistakes;
  if (elements.accuracyValue) elements.accuracyValue.textContent = accuracy + '%';
  if (elements.wpmValue) elements.wpmValue.textContent = wpm;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTimer() {
  if (state.startTime && state.isStarted) {
    state.elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
    if (elements.timeValue) elements.timeValue.textContent = formatTime(state.elapsedTime);
  }
}

async function finishGame() {
  state.isStarted = false;
  state.isWaitingRestart = true;
  
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  
  elements.typingInput.disabled = true;
  elements.startBtn.textContent = "結果送信中...";

  try {
    const result = await sendScoreResult();
    updateScoreDisplay(result);
    elements.startBtn.textContent = "リプレイ";
    elements.wordDisplay.innerHTML = `
      <div class="finish-area">
        <div class="text-xl mb-2">終了！スコアが保存されました</div>
        <div class="text-sm opacity-70">[Space] または [Enter] でリプレイ</div>
      </div>
    `;
  } catch (e) {
    console.error("Score submission error:", e);
    elements.startBtn.textContent = "再試行";
  }
}

function handleInputChange(e) {
  if (!state.isStarted) {
    e.target.value = '';
    return;
  }

  const newValue = e.target.value;
  if (newValue.length < state.inputValue.length) {
    state.inputValue = newValue;
    state.currentIndex = newValue.length;
    renderWordDisplay();
    refreshKeyboard();
    return;
  }

  const lastChar = newValue[newValue.length - 1];
  const expectedChar = state.currentWord[state.currentIndex];

  if (lastChar === expectedChar) {
    state.score.correct++;
    state.totalTyped++;
    state.inputValue = newValue;
    state.currentIndex++;
    state.pressedKey = lastChar;
  } else {
    state.score.mistakes++;
    state.missCount++;
    sounds.playError(); // SoundManagerクラスのインスタンス経由
    state.pressedKey = lastChar;
    e.target.value = state.inputValue;
    setTimeout(() => {
      state.pressedKey = '';
      refreshKeyboard();
    }, 100);
    updateScoreDisplay();
    return;
  }

  renderWordDisplay();
  updateScoreDisplay();
  refreshKeyboard();

  if (state.currentIndex === state.currentWord.length) {
    state.completedWords++;
    if (state.completedWords >= state.wordsPerSession) {
      finishGame();
    } else {
      setTimeout(loadNextWord, 200);
    }
  }
}

async function handleStart() {
  if (state.isStarted) {
    finishGame();
    return;
  }

  try {
    state.isWaitingRestart = false;
    elements.startBtn.disabled = true;
    elements.startBtn.textContent = "起動中...";
    
    await requestStartSession(state.selectedCategory);
    
    state.isStarted = true;
    state.startTime = Date.now();
    state.score = { correct: 0, mistakes: 0 };
    state.totalTyped = 0;
    state.missCount = 0;
    state.elapsedTime = 0;
    state.completedWords = 0;

    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(updateTimer, 1000);

    loadNextWord();
    updateScoreDisplay();
    if (elements.timeValue) elements.timeValue.textContent = '0:00';
    
    elements.typingInput.disabled = false;
    elements.typingInput.value = '';
    elements.typingInput.focus();

  } catch (e) {
    console.error(e);
    alert("開始できませんでした。ログイン状態を確認してください。");
  } finally {
    elements.startBtn.disabled = false;
    elements.startBtn.textContent = state.isStarted ? "中断" : "スタート";
  }
}

function handleKeyDown(e) {
  if (state.isWaitingRestart && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    handleStart();
    return;
  }
  state.pressedKey = e.key;
  refreshKeyboard();
}

function handleKeyUp() {
  setTimeout(() => {
    state.pressedKey = '';
    refreshKeyboard();
  }, 100);
}

// --- 4. 初期化 ---
function initialize() {
  elements.categorySelect?.addEventListener('change', (e) => {
    state.selectedCategory = e.target.value;
    if (state.isStarted) finishGame();
  });

  elements.startBtn?.addEventListener('click', handleStart);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  elements.typingInput?.addEventListener('input', handleInputChange);

  elements.soundToggle?.addEventListener('click', () => {
    const active = sounds.toggle();
    elements.soundToggle.classList.toggle('active', active);
  });

  if (elements.loginBtn && window.login) elements.loginBtn.addEventListener('click', window.login);
  if (elements.logoutBtn && window.logout) elements.logoutBtn.addEventListener('click', window.logout);

  loadWords();
  if (window.initSeasonalEffect) window.initSeasonalEffect('seasonalCanvas');
  updateScoreDisplay();
}

window.addEventListener('load', initialize);