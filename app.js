// --- 1. 定数と状態管理 ---
const API_BASE_URL = 'https://typing-ec-wp.uw.r.appspot.com'; // GAEのエンドポイント

const state = {
  // 元のUI用の状態
  wordData: null,
  selectedCategory: 'basic',
  currentWord: '',
  inputValue: '',
  currentIndex: 0,
  score: { correct: 0, mistakes: 0 },
  startTime: null,
  elapsedTime: 0,
  soundEnabled: true,
  bgmEnabled: false,
  pressedKey: '',
  isStarted: false,
  bgmOscillator: null,
  bgmContext: null,
  timerInterval: null,
  
  // 新しいAPI連携用の状態
  sessionId: null,
  sessionStartedAt: null, // サーバー側の開始時刻
  totalTyped: 0,          // 累計タイプ数（API送信用）
  missCount: 0            // 累計ミス数（API送信用）
};

// DOM Elements
const elements = {
  categorySelect: document.getElementById('categorySelect'),
  startBtn: document.getElementById('startBtn'),
  soundToggle: document.getElementById('soundToggle'),
  bgmToggle: document.getElementById('bgmToggle'),
  soundIcon: document.getElementById('soundIcon'),
  bgmIcon: document.getElementById('bgmIcon'),
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
  
  console.log("Session Started:", state.sessionId);
}

async function sendScoreResult() {
  const token = await getIdToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/score`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId: state.sessionId,
      totalTyped: state.totalTyped,
      missCount: state.missCount,
      elapsedMs: Date.now() - new Date(state.sessionStartedAt).getTime()
    })
  });

  if (!response.ok) throw new Error('Score submission failed');
  const result = await response.json();
  return result.data;
}

// --- 3. ロジック関数 ---

// Load words.json (ジャンルの固定化を解除)
async function loadWords() {
  try {
    const response = await fetch('words.json');
    const data = await response.json();
    state.wordData = data;
    
    // Selectボックスの初期化
    if (elements.categorySelect) {
        elements.categorySelect.innerHTML = '';
        data.categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          elements.categorySelect.appendChild(option);
        });
        // 最初のカテゴリをセット
        if (data.categories.length > 0) {
            state.selectedCategory = data.categories[0].id;
            loadRandomWord(data.categories[0].words);
        }
    }
  } catch (error) {
    console.error('Failed to load words.json:', error);
    // 読み込み失敗時のフォールバック用ダミー
    state.wordData = { categories: [{ id: 'basic', words: ['loading...'] }] };
  }
}

function loadRandomWord(words) {
  if (!words || words.length === 0) return;
  const randomWord = words[Math.floor(Math.random() * words.length)];
  state.currentWord = randomWord;
  state.inputValue = '';
  state.currentIndex = 0;
  elements.typingInput.value = '';
  
  elements.wordDisplay.classList.add('animate');
  setTimeout(() => {
    elements.wordDisplay.classList.remove('animate');
  }, 600);

  renderWordDisplay();
  refreshKeyboard();
}

function renderWordDisplay() {
  elements.wordDisplay.innerHTML = '';
  state.currentWord.split('').forEach((char, idx) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '␣' : char;
    
    if (idx < state.inputValue.length) {
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
      elements.wpmValue.textContent = serverResult.wpm;
      elements.accuracyValue.textContent = serverResult.accuracy + '%';
      return;
  }

  const totalKeystrokes = state.score.correct + state.score.mistakes;
  const accuracy = totalKeystrokes > 0 
    ? ((state.score.correct / totalKeystrokes) * 100).toFixed(1) 
    : '0.0';
  
  const timeInMinutes = state.elapsedTime / 60;
  const wpm = timeInMinutes > 0 ? Math.round((state.score.correct / 5) / timeInMinutes) : 0;
  
  elements.correctValue.textContent = state.score.correct;
  elements.mistakesValue.textContent = state.score.mistakes;
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
    elements.timeValue.textContent = formatTime(state.elapsedTime);
  }
}

function playErrorSound() {
  if (!state.soundEnabled) return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 200;
    gainNode.gain.value = 0.3;
    oscillator.start();
    setTimeout(() => { oscillator.stop(); audioContext.close(); }, 100);
  } catch (error) { console.error(error); }
}

function toggleBGM(enabled) {
  if (enabled && !state.bgmOscillator) {
    try {
      state.bgmContext = new (window.AudioContext || window.webkitAudioContext)();
      state.bgmOscillator = state.bgmContext.createOscillator();
      const gainNode = state.bgmContext.createGain();
      state.bgmOscillator.connect(gainNode);
      gainNode.connect(state.bgmContext.destination);
      state.bgmOscillator.frequency.value = 440;
      gainNode.gain.value = 0.1;
      state.bgmOscillator.start();
    } catch (e) { console.error(e); }
  } else if (!enabled && state.bgmOscillator) {
    try {
      state.bgmOscillator.stop();
      state.bgmContext.close();
      state.bgmOscillator = null;
      state.bgmContext = null;
    } catch (e) { console.error(e); }
  }
}

function handleInputChange(e) {
  if (!state.isStarted) {
      e.target.value = '';
      return;
  }

  const newValue = e.target.value;
  const newIndex = newValue.length;

  if (newValue.length > state.currentWord.length) {
    e.target.value = state.inputValue;
    return;
  }

  if (newValue.length > state.inputValue.length) {
    const lastChar = newValue[newValue.length - 1];
    const expectedChar = state.currentWord[newValue.length - 1];

    if (lastChar === expectedChar) {
      state.score.correct++;
      state.totalTyped++;
      state.inputValue = newValue;
      state.currentIndex = newIndex;
      state.pressedKey = lastChar;
    } else {
      state.score.mistakes++;
      state.missCount++;
      playErrorSound();
      state.pressedKey = lastChar;
      e.target.value = state.inputValue;
      setTimeout(() => {
        state.pressedKey = '';
        refreshKeyboard();
      }, 100);
      updateScoreDisplay();
      return;
    }
  } else {
    state.inputValue = newValue;
    state.currentIndex = newIndex;
  }

  renderWordDisplay();
  updateScoreDisplay();
  refreshKeyboard();

  if (newValue === state.currentWord) {
    // 次の単語へ
    setTimeout(() => {
        if (state.wordData && state.selectedCategory) {
            const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
            if (category) {
                loadRandomWord(category.words);
            }
        }
    }, 500);
  }
}

async function finishGame() {
    state.isStarted = false;
    clearInterval(state.timerInterval);
    elements.typingInput.disabled = true;

    try {
        const result = await sendScoreResult();
        updateScoreDisplay(result);
    } catch (e) {
        console.error("スコア送信失敗", e);
    }
}

async function handleStart() {
  if (state.isStarted) return;

  try {
      elements.startBtn.disabled = true;
      elements.startBtn.textContent = "起動中...";
      
      await requestStartSession(state.selectedCategory);
      
      state.isStarted = true;
      state.startTime = Date.now();
      state.score = { correct: 0, mistakes: 0 };
      state.totalTyped = 0;
      state.missCount = 0;
      state.elapsedTime = 0;

      if (state.timerInterval) clearInterval(state.timerInterval);
      state.timerInterval = setInterval(updateTimer, 1000);

      const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
      if (category) loadRandomWord(category.words);

      updateScoreDisplay();
      elements.typingInput.disabled = false;
      elements.typingInput.value = '';
      elements.typingInput.focus();

  } catch (e) {
      console.error(e);
      alert("開始できませんでした。ログイン状態を確認してください。");
  } finally {
      elements.startBtn.disabled = false;
      elements.startBtn.textContent = "スタート";
  }
}

function handleKeyDown(e) {
  state.pressedKey = e.key;
  refreshKeyboard();
}

function handleKeyUp() {
  setTimeout(() => {
    state.pressedKey = '';
    refreshKeyboard();
  }, 100);
}

function handleCategoryChange(e) {
  state.selectedCategory = e.target.value;
  state.isStarted = false;
  state.inputValue = '';
  state.currentIndex = 0;
  state.score = { correct: 0, mistakes: 0 };
  state.elapsedTime = 0;
  state.startTime = null;
  
  if (state.timerInterval) clearInterval(state.timerInterval);
  
  elements.timeValue.textContent = '0:00';
  updateScoreDisplay();
  
  if (state.wordData) {
      const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
      if (category) loadRandomWord(category.words);
  }
}

// --- 4. 初期化 ---
function initialize() {
    // 1. イベント登録
    if (elements.categorySelect) elements.categorySelect.addEventListener('change', handleCategoryChange);
    if (elements.startBtn) elements.startBtn.addEventListener('click', handleStart);
    if (elements.typingInput) {
        elements.typingInput.addEventListener('input', handleInputChange);
        elements.typingInput.addEventListener('keydown', handleKeyDown);
        elements.typingInput.addEventListener('keyup', handleKeyUp);
    }

    // サウンド・BGM
    if (elements.soundToggle) {
        elements.soundToggle.addEventListener('click', () => {
            state.soundEnabled = !state.soundEnabled;
            elements.soundToggle.classList.toggle('active', state.soundEnabled);
        });
    }

    if (elements.bgmToggle) {
        elements.bgmToggle.addEventListener('click', () => {
            state.bgmEnabled = !state.bgmEnabled;
            elements.bgmToggle.classList.toggle('active', state.bgmEnabled);
            toggleBGM(state.bgmEnabled);
        });
    }

    // 2. Firebase 連携
    if (elements.loginBtn && typeof window.login === 'function') {
        elements.loginBtn.addEventListener('click', window.login);
    }
    if (elements.logoutBtn && typeof window.logout === 'function') {
        elements.logoutBtn.addEventListener('click', window.logout);
    }

    // 3. データロード & エフェクト開始
    loadWords();
    if (window.initSeasonalEffect) {
        window.initSeasonalEffect('seasonalCanvas');
    }

    // UI初期状態
    updateScoreDisplay();
    if (elements.timeValue) elements.timeValue.textContent = '0:00';
    if (elements.typingInput) elements.typingInput.disabled = true;
}

window.addEventListener('DOMContentLoaded', initialize);