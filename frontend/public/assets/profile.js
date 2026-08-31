/**
 * ユーザープロフィール管理
 *
 * ログイン時に GET /api/profile を呼び出し、プロフィールを取得する
 * （バックエンド側で初回利用者は自動的に作成される）。
 * 表示名の編集は PATCH /api/profile で行う。
 */

let currentProfile = null;

const profileElements = {
  userName: document.getElementById('userName'),
  editBtn: document.getElementById('editNameBtn'),
};

/**
 * プロフィールを取得する（無ければサーバー側で自動作成される）
 */
async function fetchOrCreateProfile() {
  const token = await getIdToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await response.json();

    if (json.ok) {
      currentProfile = json.data;
      applyProfileToUI();
    }
    return currentProfile;
  } catch (e) {
    console.error('Failed to fetch profile', e);
    return null;
  }
}

/**
 * 取得済みのプロフィールを画面へ反映する
 */
function applyProfileToUI() {
  if (!currentProfile || !profileElements.userName) return;
  profileElements.userName.textContent = currentProfile.displayName;
}

/**
 * 表示名を更新する
 */
async function updateDisplayName(newName) {
  const token = await getIdToken();
  if (!token || !newName || !newName.trim()) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ displayName: newName.trim() })
    });
    const json = await response.json();

    if (json.ok) {
      currentProfile = json.data;
      applyProfileToUI();
    } else {
      alert(json.error || '表示名の更新に失敗しました。');
    }
  } catch (e) {
    console.error('Failed to update profile', e);
    alert('通信エラーが発生しました。');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (profileElements.editBtn) {
    profileElements.editBtn.addEventListener('click', () => {
      const current = currentProfile ? currentProfile.displayName : '';
      const next = window.prompt('新しい表示名を入力してください（20文字以内）', current);
      if (next !== null) {
        updateDisplayName(next);
      }
    });
  }
});
