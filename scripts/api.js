class APIManager {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async getAuthToken() {
    // 1. window.auth (firebase-auth.jsで定義) を確認
    if (window.auth && window.auth.currentUser) {
      return await window.auth.currentUser.getIdToken(true);
    }
    // 2. window.firebase グローバルオブジェクトを確認 (予備)
    if (window.firebase && window.firebase.auth().currentUser) {
      return await window.firebase.auth().currentUser.getIdToken(true);
    }
    return null;
  }

  async request(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    
    // トークン取得 (失敗してもリクエストは投げる -> PHP側で弾くか、ゲストとして扱うかはバックエンド次第)
    try {
        const token = await this.getAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
        console.warn("Token fetch failed:", e);
    }

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    // GAEのエンドポイントへ送信
    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
    }
    return response.json();
  }

  async startSession(categoryId) {
    const json = await this.request('/api/session/start', 'POST', { category: categoryId });
    return json.data;
  }

  async submitScore(payload) {
    const json = await this.request('/api/score', 'POST', payload);
    return json.data;
  }
}