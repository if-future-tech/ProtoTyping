// /scripts/firebase-auth.js

// TODO: あなたの Firebase コンソールの設定をここに貼り付けてください
const firebaseConfig = {
    apiKey: "AIzaSyD3c_blH9dIaOjp8hfdENcl0F2s2Y4xlFs",
    authDomain: "typing-ec-wp.firebaseapp.com",
    projectId: "typing-ec-wp",
    storageBucket: "typing-ec-wp.firebasestorage.app",
    messagingSenderId: "659037616745",
    appId: "1:659037616745:web:2056a2db406a34103540f8",
    measurementId: "G-NMBQ87GV4S"
};
// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

/**
 * ログイン状態の監視
 */
auth.onAuthStateChanged((user) => {
  const loginPrompt = document.getElementById('loginPrompt');
  const userGreeting = document.getElementById('userGreeting');
  const userName = document.getElementById('userName');

  if (user) {
    loginPrompt.style.display = 'none';
    userGreeting.style.display = 'inline';
    userName.textContent = user.displayName || 'ユーザー';
  } else {
    loginPrompt.style.display = 'inline';
    userGreeting.style.display = 'none';
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
  return await user.getIdToken(true);
}

/*
// /scripts/firebase-auth.js（例：責務イメージ）
let firebaseUser = null;
let idToken = null;

function initFirebaseAuth() {
  // initializeApp(...)
  // onAuthStateChanged(...)
}

async function login() {
  // signInWithPopup
}

async function logout() {
  // signOut
}

async function getIdToken() {
  if (!firebaseUser) return null;
  return await firebaseUser.getIdToken();
}
*/