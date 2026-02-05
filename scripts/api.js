/**
 * APIManager サーバー通信の関心事をこの中に閉じ込める
 */
class APIManager {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async getAuthToken() {
    if (window.auth && window.auth.currentUser) {
      return window.auth.currentUser.getIdToken();
    }
    return null;
  }

  async request(endpoint, method = 'GET', body = null) {
    const token = await this.getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

  async startSession(categoryId) {
    const json = await this.request('/api/session/start', 'POST', { category: categoryId });
    return json.data; // { sessionId, startedAt }
  }

  async submitScore(payload) {
    const json = await this.request('/api/score', 'POST', payload);
    return json.data; // { wpm, accuracy, ... }
  }
}
