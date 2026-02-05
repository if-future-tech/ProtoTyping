// /scripts/firebase-auth.js

const firebaseConfig = {
    apiKey: "AIzaSyD3c_blH9dIaOjp8hfdENcl0F2s2Y4xlFs",
    authDomain: "typing-ec-wp.firebaseapp.com",
    projectId: "typing-ec-wp",
    storageBucket: "typing-ec-wp.firebasestorage.app",
    messagingSenderId: "659037616745",
    appId: "1:659037616745:web:2056a2db406a34103540f8",
    measurementId: "G-NMBQ87GV4S"
};

if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} else {
    console.error("Firebase SDK missing.");
}

// 【重要】APIManagerから参照できるように window オブジェクトへ公開
const auth = firebase.auth();
window.auth = auth; 

let firebaseUser = null;

// UI更新関数
function updateAuthUI(user) {
    const loginPrompt = document.getElementById('loginPrompt');
    const userGreeting = document.getElementById('userGreeting');
    const userName = document.getElementById('userName');

    if (user) {
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (userGreeting) userGreeting.style.display = 'inline';
        if (userName) userName.textContent = user.displayName || 'ユーザー';
    } else {
        if (loginPrompt) loginPrompt.style.display = 'inline';
        if (userGreeting) userGreeting.style.display = 'none';
    }
}

auth.onAuthStateChanged((user) => {
    firebaseUser = user;
    updateAuthUI(user);
    console.log("Auth State Changed:", user ? "Logged In" : "Logged Out");
});

window.login = async function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error("Login failed:", error);
    }
};

window.logout = async function() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Logout failed:", error);
    }
};