// /assets/firebase-auth.js

const firebaseConfig = {
    apiKey: "AIzaSyD3c_blH9dIaOjp8hfdENcl0F2s2Y4xlFs",
    authDomain: "typing-ec-wp.firebaseapp.com",
    projectId: "typing-ec-wp",
    storageBucket: "typing-ec-wp.firebasestorage.app",
    messagingSenderId: "659037616745",
    appId: "1:659037616745:web:2056a2db406a34103540f8",
    measurementId: "G-NMBQ87GV4S"
};

// 1. Firebase初期化（一度だけ実行）
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} else {
    console.error("Firebase SDK is not loaded. Check your index.html script tags.");
}

const auth = firebase.auth();
let firebaseUser = null;

// 2. UI更新関数
function updateAuthUI(user) {
    const loginPrompt = document.getElementById('loginPrompt');
    const userGreeting = document.getElementById('userGreeting');
    const userName = document.getElementById('userName');

    if (user) {
        if (loginPrompt) loginPrompt.style.display = 'none';
        // .user-greeting クラス側で display: inline-flex を指定しているため、
        // ここで 'inline' を指定すると上書きしてしまい、以前のレイアウト崩れが再発する。
        if (userGreeting) userGreeting.style.display = 'inline-flex';
        // バックエンドのプロフィール(display_name)取得が完了するまでの暫定表示。
        // 完了次第 profile.js の applyProfileToUI() が上書きする。
        if (userName) userName.textContent = user.displayName || 'ユーザー';
    } else {
        if (loginPrompt) loginPrompt.style.display = 'inline';
        if (userGreeting) userGreeting.style.display = 'none';
    }
}

// 3. ログイン状態監視
auth.onAuthStateChanged((user) => {
    firebaseUser = user;
    updateAuthUI(user);

    // ログイン済みならプロフィールを取得（無ければサーバー側で自動作成される）
    if (user && typeof fetchOrCreateProfile === 'function') {
        fetchOrCreateProfile();
    }
});

/**
 * Googleログイン
 */
async function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error("Login failed:", error);
        alert("ログインに失敗しました。");
    }
}

/**
 * ログアウト
 */
async function logout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Logout failed:", error);
    }
}

/**
 * 最新のIDトークンを取得（API送信時に使用）
 */
async function getIdToken() {
    const user = auth.currentUser;
    if (!user) return null;
    // キャッシュされたトークンではなく、常に最新のものを取得
    return await user.getIdToken(true);
}
