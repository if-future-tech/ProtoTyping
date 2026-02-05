/**
 * app.js
 * * メインロジック：タイピングの進行管理、UI制御（司令塔）
 * * 依存関係: APIManager, SoundManager, KeyboardManager, FirebaseAuth が事前に読み込まれていること
 */

// --- 1. 設定と状態管理 ---
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
  isCountingDown: false,
  isWaitingRestart: false,
  timerInterval: null,
  
  wordsPerSession: 10,
  completedWords: 0,
  
  sessionId: null,
  sessionStartedAt: null,
  totalTyped: 0,
  missCount: 0,
  isGuestMode: false // ゲスト（未ログイン）状態を追跡
};

// --- 2. マネージャーのインスタンス化 ---
const api = new APIManager(API_BASE_URL);
const sounds = new SoundManager();

// DOM要素のキャッシュ
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

// --- 3. コアロジック関数 ---

/**
 * 単語リストの読み込み
 */
async function loadWords() {
  try {
    const response = await fetch('words.json');
    if (!response.ok) throw new Error('Network response was not ok');
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
    state.wordData = { categories: [{ id: 'basic', name: '基本', words: ['TYPING'] }] };
  }
}

/**
 * カウントダウン（色エフェクト）の描画
 */
function renderCountdown(count) {
  if (!elements.wordDisplay) return;
  
  let bgColor = "#f3f4f6";
  
  if (count === 3) bgColor = "#ef4444"; // 赤
  if (count === 2) bgColor = "#eab308"; // 黄
  if (count === 1) bgColor = "#22c55e"; // 緑
  if (count === 0) bgColor = "#3b82f6"; // 青

  if (count >= 0) {
    elements.wordDisplay.style.backgroundColor = bgColor;
    elements.wordDisplay.style.color = (count === 2 ? "#000" : "#fff");
    elements.wordDisplay.style.borderRadius = "8px";
    elements.wordDisplay.style.transition = "all 0.2s ease";
    
    elements.wordDisplay.innerHTML = `
      <div style="font-size: 5rem; font-weight: 900; padding: 20px;">
        ${count > 0 ? count : 'GO!'}
      </div>
    `;
  }
}

/**
 * 次の単語のセットアップ
 */
function loadNextWord() {
  if (!state.wordData) return;
  const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
  if (!category || !category.words) return;
  
  const randomWord = category.words[Math.floor(Math.random() * category.words.length)];
  state.currentWord = randomWord;
  state.inputValue = '';
  state.currentIndex = 0;
  
  if (elements.typingInput) elements.typingInput.value = '';
  
  elements.wordDisplay.style.backgroundColor = "transparent";
  elements.wordDisplay.style.color = "inherit";

  elements.wordDisplay.classList.add('animate');
  setTimeout(() => elements.wordDisplay.classList.remove('animate'), 600);

  renderWordDisplay();
  refreshKeyboard();
}

/**
 * 単語表示のレンダリング
 */
function renderWordDisplay() {
  if (!elements.wordDisplay || state.isCountingDown) return; 

  elements.wordDisplay.innerHTML = '';
  
  if (!state.currentWord) {
    elements.wordDisplay.innerHTML = '<span style="opacity: 0.5;">READY?</span>';
    return;
  }

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

/**
 * キーボード表示の更新
 */
function refreshKeyboard() {
  const km = window.KeyboardManager || (typeof KeyboardManager !== 'undefined' ? KeyboardManager : null);
  if (km) {
    km.render('keyboard', state.pressedKey, state.currentWord, state.currentIndex);
  }
}

/**
 * スコアボードの更新
 */
function updateScoreDisplay(serverResult = null) {
  if (serverResult) {
    if (elements.wpmValue) elements.wpmValue.textContent = serverResult.wpm || '0';
    if (elements.accuracyValue) elements.accuracyValue.textContent = (serverResult.accuracy || '0.0') + '%';
    return;
  }

  const totalKeystrokes = state.score.correct + state.score.mistakes;
  const accuracy = totalKeystrokes > 0 ? ((state.score.correct / totalKeystrokes) * 100).toFixed(1) : '0.0';
  const timeInMinutes = state.elapsedTime / 60;
  const wpm = timeInMinutes > 0 ? Math.round((state.score.correct / 5) / timeInMinutes) : 0;
  
  if (elements.correctValue) elements.correctValue.textContent = state.score.correct;
  if (elements.mistakesValue) elements.mistakesValue.textContent = state.score.mistakes;
  if (elements.accuracyValue) elements.accuracyValue.textContent = accuracy + '%';
  if (elements.wpmValue) elements.wpmValue.textContent = wpm;
}

/**
 * タイマー文字列の整形
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * ゲーム終了処理
 */
async function finishGame() {
  state.isStarted = false;
  state.isWaitingRestart = true;
  
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  
  elements.typingInput.disabled = true;

  // ログインしていない場合はローカル表示のみで終了
  if (state.isGuestMode) {
    elements.startBtn.textContent = "リプレイ";
    elements.wordDisplay.innerHTML = `
      <div class="finish-area" style="text-align: center;">
        <div style="font-size: 1.25rem; margin-bottom: 0.5rem; font-weight: bold;">お疲れ様でした！</div>
        <div style="font-size: 0.875rem; opacity: 0.7; color: #6b7280;">ログインするとスコアを記録できます</div>
      </div>
    `;
    return;
  }

  // ログイン済みの場合の保存フロー
  elements.startBtn.textContent = "保存中...";
  elements.wordDisplay.innerHTML = `
    <div style="text-align: center; opacity: 0.7;">
      <div style="font-size: 1rem;">スコアを送信しています...</div>
    </div>
  `;

  try {
    const elapsedMs = Date.now() - new Date(state.sessionStartedAt).getTime();
    
    const result = await api.submitScore({
      sessionId: state.sessionId,
      totalTyped: state.totalTyped,
      missCount: state.missCount,
      elapsedMs: elapsedMs
    });

    updateScoreDisplay(result);
    elements.startBtn.textContent = "リプレイ";
    elements.wordDisplay.innerHTML = `
      <div class="finish-area" style="text-align: center;">
        <div style="font-size: 1.25rem; margin-bottom: 0.5rem; font-weight: bold;">終了！スコアを保存しました</div>
        <div style="font-size: 0.875rem; opacity: 0.7;">[Space] または [Enter] でリプレイ</div>
      </div>
    `;
  } catch (e) {
    console.error("Score submission error:", e);
    elements.startBtn.textContent = "再試行";
    elements.wordDisplay.innerHTML = `
      <div style="text-align: center;">
        <div style="color: #ef4444; font-weight: bold; margin-bottom: 5px;">保存に失敗しました</div>
        <div style="font-size: 0.75rem; opacity: 0.6;">通信状況を確認してください</div>
      </div>
    `;
  }
}

/**
 * 入力イベントハンドラ
 */
function handleInputChange(e) {
  if (!state.isStarted || state.isCountingDown) {
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
    sounds.playError();
    state.pressedKey = lastChar;
    e.target.value = state.inputValue;
    setTimeout(() => { state.pressedKey = ''; refreshKeyboard(); }, 100);
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

/**
 * ゲーム開始ハンドラ
 */
async function handleStart() {
  if (state.isStarted || state.isCountingDown) {
    finishGame();
    return;
  }

  try {
    state.isWaitingRestart = false;
    elements.startBtn.disabled = true;
    elements.startBtn.textContent = "...";
    
    // ログイン状態を確認
    const token = await api.getAuthToken();
    if (token) {
      // ログイン済み：サーバーと通信してセッション開始
      state.isGuestMode = false;
      const sessionData = await api.startSession(state.selectedCategory);
      state.sessionId = sessionData.sessionId;
      state.sessionStartedAt = sessionData.startedAt;
    } else {
      // 未ログイン：ゲストモードで続行
      state.isGuestMode = true;
      state.sessionId = null;
      state.sessionStartedAt = new Date().toISOString();
    }
    
    state.isCountingDown = true;
    elements.typingInput.disabled = true;
    
    for (let i = 3; i >= 0; i--) {
      renderCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    state.isCountingDown = false;
    state.isStarted = true;
    state.startTime = Date.now();
    state.score = { correct: 0, mistakes: 0 };
    state.totalTyped = 0;
    state.missCount = 0;
    state.elapsedTime = 0;
    state.completedWords = 0;

    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
      if (elements.timeValue) elements.timeValue.textContent = formatTime(state.elapsedTime);
    }, 1000);

    loadNextWord();
    updateScoreDisplay();
    
    elements.typingInput.disabled = false;
    elements.typingInput.value = '';
    elements.typingInput.focus();

  } catch (e) {
    console.error("Game start error:", e);
    // サーバーエラー時も、せっかくなのでゲストモードとして遊べるようにする
    state.isGuestMode = true;
    state.isCountingDown = false;
    state.isStarted = true;
  } finally {
    elements.startBtn.disabled = false;
    elements.startBtn.textContent = state.isStarted ? "中断" : "スタート";
  }
}

/**
 * キー入力イベント
 */
function handleKeyDown(e) {
  if (state.isWaitingRestart && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    handleStart();
    return;
  }
  state.pressedKey = e.key;
  refreshKeyboard();
}

/**
 * キーアップイベント
 */
function handleKeyUp() {
  setTimeout(() => {
    state.pressedKey = '';
    refreshKeyboard();
  }, 100);
}

// --- 4. 初期化 ---
async function initialize() {
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

  if (elements.loginBtn && typeof window.login === 'function') {
    elements.loginBtn.addEventListener('click', window.login);
  }
  if (elements.logoutBtn && typeof window.logout === 'function') {
    elements.logoutBtn.addEventListener('click', window.logout);
  }

  await loadWords();
  if (window.initSeasonalEffect) window.initSeasonalEffect('seasonalCanvas');
  
  renderWordDisplay();
  refreshKeyboard();
  updateScoreDisplay();
}

window.addEventListener('load', initialize);