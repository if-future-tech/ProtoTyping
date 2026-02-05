// --- サウンド管理クラス ---
class SoundManager {
  constructor() {
    this.enabled = true;
  }

  toggle(force) {
    this.enabled = force !== undefined ? force : !this.enabled;
    return this.enabled;
  }

  playError() {
    if (!this.enabled) return;
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
    } catch (error) { console.error('Sound error:', error); }
  }
}
