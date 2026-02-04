/**
 * keyboard.js
 * 仮想キーボードの描画と状態管理を行うモジュール
 */

(function() {
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
  
    // ヘルパー関数
    function normalizeKey(key) {
        if (!key) return '';
        if (key === ' ') return ' ';
        return key.toLowerCase();
    }
  
    // グローバルに公開
    window.KeyboardManager = {
        render: function(elementId, pressedKey, currentWord, currentIndex) {
            const container = document.getElementById(elementId);
            if (!container) return;
  
            container.innerHTML = '';
            const expectedChar = currentWord ? currentWord[currentIndex] : '';
  
            keyboardLayout.forEach(row => {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'keyboard-row';
  
                row.forEach(keyData => {
                    const keyDiv = document.createElement('div');
                    const widthClass = keyData.width || 'key-normal';
                    let stateClass = 'key-default';
  
                    // 状態判定
                    if (normalizeKey(pressedKey) === normalizeKey(keyData.key)) {
                        stateClass = 'key-pressed';
                    } else if (normalizeKey(expectedChar) === normalizeKey(keyData.key)) {
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
  
                container.appendChild(rowDiv);
            });
  
            // 凡例の追加
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
            container.appendChild(legend);
        }
    };
  })();