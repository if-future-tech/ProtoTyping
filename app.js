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

// Keyboard Layout
const keyboardLayout = [
  [
    { key: '`', display: '`' },
    { key: '1' },
    { key: '2' },
    { key: '3' },
    { key: '4' },
    { key: '5' },
    { key: '6' },
    { key: '7' },
    { key: '8' },
    { key: '9' },
    { key: '0' },
    { key: '-' },
    { key: '=' },
    { key: 'Backspace', display: '⌫', width: 'key-backspace' }
  ],
  [
    { key: 'Tab', display: 'Tab', width: 'key-tab' },
    { key: 'q' },
    { key: 'w' },
    { key: 'e' },
    { key: 'r' },
    { key: 't' },
    { key: 'y' },
    { key: 'u' },
    { key: 'i' },
    { key: 'o' },
    { key: 'p' },
    { key: '[' },
    { key: ']' },
    { key: '\\' }
  ],
  [
    { key: 'CapsLock', display: 'Caps', width: 'key-caps' },
    { key: 'a', isHomeRow: true },
    { key: 's', isHomeRow: true },
    { key: 'd', isHomeRow: true },
    { key: 'f', isHomeRow: true },
    { key: 'g' },
    { key: 'h' },
    { key: 'j', isHomeRow: true },
    { key: 'k', isHomeRow: true },
    { key: 'l', isHomeRow: true },
    { key: ';', isHomeRow: true },
    { key: "'" },
    { key: 'Enter', display: '⏎', width: 'key-enter' }
  ],
  [
    { key: 'Shift', display: 'Shift', width: 'key-shift' },
    { key: 'z' },
    { key: 'x' },
    { key: 'c' },
    { key: 'v' },
    { key: 'b' },
    { key: 'n' },
    { key: 'm' },
    { key: ',' },
    { key: '.' },
    { key: '/' },
    { key: 'Shift', display: 'Shift', width: 'key-shift' }
  ],
  [
    { key: 'Control', display: 'Ctrl', width: 'key-ctrl' },
    { key: 'Alt', display: 'Alt', width: 'key-alt' },
    { key: ' ', display: 'Space', width: 'key-space' },
    { key: 'Alt', display: 'Alt', width: 'key-alt' },
    { key: 'Control', display: 'Ctrl', width: 'key-ctrl' }
  ]
];

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

// Normalize key for comparison
function normalizeKey(key) {
  if (key === ' ') return ' ';
  return key.toLowerCase();
}

// Check if key is pressed
function isPressed(keyData) {
  return normalizeKey(state.pressedKey) === normalizeKey(keyData.key);
}

// Check if key is expected
function isExpected(keyData) {
  const expectedKey = state.currentWord[state.currentIndex] || '';
  return normalizeKey(expectedKey) === normalizeKey(keyData.key);
}

// Render keyboard
function renderKeyboard() {
  elements.keyboard.innerHTML = '';
  
  keyboardLayout.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'keyboard-row';
    
    row.forEach(keyData => {
      const keyDiv = document.createElement('div');
      const widthClass = keyData.width || 'key-normal';
      let stateClass = 'key-default';
      
      if (isPressed(keyData)) {
        stateClass = 'key-pressed';
      } else if (isExpected(keyData)) {
        stateClass = 'key-expected';
      } else if (keyData.isHomeRow) {
        stateClass = 'key-home';
      }
      
      keyDiv.className = `key ${widthClass} ${stateClass}`;
      
      const span = document.createElement('span');
      span.textContent = keyData.display || keyData.key.toUpperCase();
      keyDiv.appendChild(span);
      
      if (keyData.isHomeRow) {
        const dot = document.createElement('div');
        dot.className = 'key-home-dot';
        keyDiv.appendChild(dot);
      }
      
      rowDiv.appendChild(keyDiv);
    });
    
    elements.keyboard.appendChild(rowDiv);
  });
  
  // Add legend
  const legend = document.createElement('div');
  legend.className = 'keyboard-legend';
  legend.innerHTML = `
    <div class="legend-item">
      <div class="legend-box legend-home"></div>
      <span class="legend-text">ホームポジション</span>
    </div>
    <div class="legend-item">
      <div class="legend-box legend-next"></div>
      <span class="legend-text">次のキー</span>
    </div>
    <div class="legend-item">
      <div class="legend-box legend-pressed"></div>
      <span class="legend-text">押下中</span>
    </div>
  `;
  elements.keyboard.appendChild(legend);
}

// Seasonal Effect
function initSeasonalEffect() {
  const canvas = elements.seasonalCanvas;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationFrame;

  const getSeason = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  };

  const season = getSeason();

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const createParticle = () => {
    const particle = {
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      vx: 0,
      vy: 0,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2,
      size: 0,
      opacity: 0.3 + Math.random() * 0.3,
      flicker: Math.random() * Math.PI * 2
    };

    switch (season) {
      case 'spring':
        particle.vx = (Math.random() - 0.5) * 1.5;
        particle.vy = 0.5 + Math.random() * 0.5;
        particle.size = 8 + Math.random() * 6;
        break;
      case 'summer':
        particle.vx = (Math.random() - 0.5) * 0.8;
        particle.vy = (Math.random() - 0.5) * 0.8;
        particle.size = 3 + Math.random() * 2;
        particle.opacity = 0.5;
        break;
      case 'autumn':
        particle.vx = (Math.random() - 0.5) * 1;
        particle.vy = 0.8 + Math.random() * 0.7;
        particle.size = 10 + Math.random() * 8;
        break;
      case 'winter':
        particle.vx = (Math.random() - 0.5) * 0.5;
        particle.vy = 0.3 + Math.random() * 0.4;
        particle.size = 3 + Math.random() * 4;
        particle.rotationSpeed = 0;
        break;
    }

    return particle;
  };

  const drawParticle = (particle) => {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);

    switch (season) {
      case 'spring':
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = '#FFB7C5';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * particle.size;
          const y = Math.sin(angle) * particle.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'summer':
        const glow = Math.sin(particle.flicker) * 0.5 + 0.5;
        ctx.globalAlpha = particle.opacity * glow;
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 3);
        gradient.addColorStop(0, 'rgba(255, 255, 150, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 100, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 50, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(-particle.size * 3, -particle.size * 3, particle.size * 6, particle.size * 6);
        
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = '#FFFF88';
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'autumn':
        ctx.globalAlpha = particle.opacity;
        const colors = ['#D2691E', '#FF8C00', '#CD853F', '#8B4513'];
        ctx.fillStyle = colors[Math.floor(particle.x % colors.length)];
        
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size * 0.6, particle.size, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -particle.size);
        ctx.lineTo(0, particle.size);
        ctx.stroke();
        break;

      case 'winter':
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * particle.size, Math.sin(angle) * particle.size);
          ctx.stroke();
        }
        break;
    }

    ctx.restore();
  };

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;

      if (season === 'summer') {
        particle.flicker += 0.1;
      }

      if (season === 'spring' || season === 'autumn') {
        particle.x += Math.sin(particle.y * 0.01) * 0.2;
      }

      if (
        particle.y > canvas.height + 50 ||
        particle.x < -50 ||
        particle.x > canvas.width + 50
      ) {
        particles[index] = createParticle();
      }

      drawParticle(particle);
    });

    animationFrame = requestAnimationFrame(animate);
  };

  const count = season === 'summer' ? 15 : 30;
  for (let i = 0; i < count; i++) {
    particles.push(createParticle());
  }

  animate();
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
