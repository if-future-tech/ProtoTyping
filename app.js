// 状態管理
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
  bgmOscillator: null,
  bgmContext: null,
  timerInterval: null
};

// アプリ状態（API前提）
const appState = {
  status: 'idle',      // idle | running | finished
  sessionId: null,     // サーバー発行
  startedAt: null      // サーバー時刻（文字列 or ms）
};

//scoreState missCount API用スコア項目追加
const scoreState = {
  totalTyped: 0,
  missCount: 0,
  wpm: 0,
  accuracy: 0
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
  seasonalCanvas: document.getElementById('seasonalCanvas')
};


// Load words.json
async function loadWords() {
  try {
    const response = await fetch('words.json');
    const data = await response.json();
    state.wordData = data;
    
    // Populate category select
    elements.categorySelect.innerHTML = '';
    data.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      elements.categorySelect.appendChild(option);
    });
    
    // Load initial word
    if (data.categories.length > 0) {
      loadRandomWord(data.categories[0].words);
    }
  } catch (error) {
    console.error('Failed to load words.json:', error);
  }
}

// Load ランダムワード出題
function loadRandomWord(words) {
  const randomWord = words[Math.floor(Math.random() * words.length)];
  state.currentWord = randomWord;
  state.inputValue = '';
  state.currentIndex = 0;
  elements.typingInput.value = '';
  // ★ 出題切り替え時だけアニメーション
  elements.wordDisplay.classList.add('animate');
  setTimeout(() => {
    elements.wordDisplay.classList.remove('animate');
  }, 600);

  renderWordDisplay();
}

// Render 出題表示
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

// Update スコア表示
function updateScoreDisplay() {
  const totalKeystrokes = state.score.correct + state.score.mistakes;
  const accuracy = totalKeystrokes > 0 
    ? ((state.score.correct / totalKeystrokes) * 100).toFixed(1) 
    : '0.0';
  
  const timeInMinutes = state.elapsedTime / 60;
  const wpm = timeInMinutes > 0 ? Math.round((state.score.correct / 5) / timeInMinutes) : 0;
  
  elements.correctValue.textContent = state.score.correct;
  elements.mistakesValue.textContent = state.score.mistakes;
  elements.accuracyValue.textContent = accuracy + '%';
  elements.wpmValue.textContent = wpm;
}

// Format time
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update timer
function updateTimer() {
  if (state.uiStartTime && state.isStarted) {
    state.elapsedTime = Math.floor((Date.now() - state.uiStartTime) / 1000);
    elements.timeValue.textContent = formatTime(state.elapsedTime);
  }
}

// Play error sound
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
    
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 100);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

// Toggle BGM
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
    } catch (error) {
      console.error('Error starting BGM:', error);
    }
  } else if (!enabled && state.bgmOscillator) {
    try {
      state.bgmOscillator.stop();
      state.bgmContext.close();
      state.bgmOscillator = null;
      state.bgmContext = null;
    } catch (error) {
      console.error('Error stopping BGM:', error);
    }
  }
}
/**
 * セッション開始要求
 * フロントは「開始したい」という意思だけを送る
 */
async function requestStartSession(categoryId) {
  const response = await fetch('api/index.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      category: categoryId
    })
  });

  if (!response.ok) {
    throw new Error('Failed to start session');
  }

  const json = await response.json();
    //const data = await response.json();

  // app.js が保持する最低限の状態
  appState.sessionId = json.data.sessionId;
  appState.startedAt = json.data.startedAt;
  console.log("API raw response:", json);
  console.log("startedAt in JS:", json.data?.startedAt);
  //console.log("startedAt in JS:", appState.startedAt);
}
/**
 * セッション終了時のスコア送信
 * 「事実データ」だけを送信する
 */
async function sendScoreResult() {
  const response = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: appState.sessionId,
      totalTyped: scoreState.totalTyped,
      missCount: scoreState.missCount,
      elapsedMs: Date.now() - new Date(appState.startedAt).getTime() // ← サーバー基準で統一
    })
  });

  if (!response.ok) {
    throw new Error('Failed to submit score');
  }

  const result = await response.json();

  // PHP が確定した「公式結果」
  scoreState.wpm = result.wpm;
  scoreState.accuracy = result.accuracy;
}

// 終了処理
async function finishGame() {
  appState.status = 'finished';

  // タイマー停止
  if (state.timerInterval) clearInterval(state.timerInterval);

  // API に結果送信
  await sendScoreResult();

  // サーバーが返した“公式結果”を UI に反映
  elements.wpmValue.textContent = scoreState.wpm;
  elements.accuracyValue.textContent = scoreState.accuracy + '%';

  // 入力欄を無効化
  elements.typingInput.blur();
  elements.typingInput.disabled = true; // 入力不可にする
  // 結果モーダルを出すならここ
  // showResultModal(scoreState);
}

// Handle 入力判定
function handleInputChange(e) {
  // ★ セッション未開始（sessionIdなし）
  if (!appState.sessionId) {
    alert('ジャンルを選んでスタートを押してください！');
    e.target.value = '';
    return;
  }

  const newValue = e.target.value;
  const newIndex = newValue.length;

  // 入力が長すぎる場合は拒否
  if (newValue.length > state.currentWord.length) {
    e.target.value = state.inputValue;
    return;
  }

  // Check 入力が正しいか
  if (newValue.length > state.inputValue.length) {
    const lastChar = newValue[newValue.length - 1];
    const expectedChar = state.currentWord[newValue.length - 1];

    if (lastChar === expectedChar) {
      scoreState.totalTyped++;
      state.score.correct++;
      state.inputValue = newValue;
      state.currentIndex = newIndex;
      state.pressedKey = lastChar;
    } else {
      scoreState.missCount++;
      scoreState.totalTyped++;
      state.score.mistakes++;
      playErrorSound();
      state.pressedKey = lastChar;
      e.target.value = state.inputValue;
      
      setTimeout(() => {
        state.pressedKey = '';
        renderKeyboard();
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
  renderKeyboard();

  // Check 正解したら次へ
  if (newValue === state.currentWord) {
    // 正解数が上限に達したら終了
    if (state.score.correct >= 10) {
      finishGame();
      return;
    }
    // 終了していたら回さない
    setTimeout(() => {
      const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
      if (category) {
        loadRandomWord(category.words);
        renderKeyboard();
      }
    }, 500);
  }
}

// Handle key down
function handleKeyDown(e) {
  state.pressedKey = e.key;
  renderKeyboard();
}

// Handle key up
function handleKeyUp() {
  setTimeout(() => {
    state.pressedKey = '';
    renderKeyboard();
  }, 100);
}

// Handle スタートボタン
async function handleStart() {
  // API に開始要求
  try {
    await requestStartSession(state.selectedCategory);
  } catch (e) {
    alert("セッション開始に失敗しました。通信環境を確認してください。");
    return;
  }

  appState.status = 'running';

  // 入力欄を有効化
  elements.typingInput.disabled = false;

  // ローカル表示用の開始時刻（サーバーとは無関係）
  state.uiStartTime = Date.now();

  // ★ appState.startedAt はサーバー値を絶対に上書きしない

  // ローカルスコア初期化
  state.isStarted = true;
  state.score = { correct: 0, mistakes: 0 };
  scoreState.totalTyped = 0;
  scoreState.missCount = 0;

  state.elapsedTime = 0;

  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(updateTimer, 1000);

  // 最初の問題
  const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
  if (category) loadRandomWord(category.words);

  updateScoreDisplay();
  elements.typingInput.focus();
}
// Handle カテゴリ変更
function handleCategoryChange(e) {
  appState.status = 'idle';
  appState.sessionId = null;
  appState.startedAt = null;

  scoreState.totalTyped = 0;
  scoreState.missCount = 0;

  state.selectedCategory = e.target.value;
  state.isStarted = false;
  state.inputValue = '';
  state.currentIndex = 0;
  state.score = { correct: 0, mistakes: 0 };
  state.elapsedTime = 0;
  state.startTime = null;
  
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
  
  if (state.wordData) {
    const category = state.wordData.categories.find(c => c.id === state.selectedCategory);
    if (category) {
      loadRandomWord(category.words);
    }
  }
  
  elements.typingInput.value = '';
  updateScoreDisplay();
  elements.timeValue.textContent = '0:00';
}


// Event Listeners
elements.categorySelect.addEventListener('change', handleCategoryChange);
elements.startBtn.addEventListener('click', handleStart);
elements.typingInput.addEventListener('input', handleInputChange);
elements.typingInput.addEventListener('keydown', handleKeyDown);
elements.typingInput.addEventListener('keyup', handleKeyUp);

elements.soundToggle.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  elements.soundToggle.classList.toggle('active', state.soundEnabled);
  
  if (!state.soundEnabled) {
    elements.soundIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <line x1="23" y1="9" x2="17" y2="15"></line>
      <line x1="17" y1="9" x2="23" y2="15"></line>
    `;
  } else {
    elements.soundIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    `;
  }
});

elements.bgmToggle.addEventListener('click', () => {
  state.bgmEnabled = !state.bgmEnabled;
  elements.bgmToggle.classList.toggle('active', state.bgmEnabled);
  toggleBGM(state.bgmEnabled);
});

// Initialize
loadWords();
renderKeyboard();
initSeasonalEffect();
updateScoreDisplay();
elements.timeValue.textContent = '0:00';
