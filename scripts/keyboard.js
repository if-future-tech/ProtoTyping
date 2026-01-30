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

/**
 * ソフトキーボード描画・制御

const keyboardLayout = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m']
];
 */

/**
 * キーボードを描画する

function renderKeyboard(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // DOM生成はここに書く
}
 */
/**
 * 押されたキーをハイライト
function highlightKey(key) {
  // 実装予定
}
 */
/**
 * 次に押すべきキーを示す
function markExpectedKey(key) {
  // 実装予定
}
 */
