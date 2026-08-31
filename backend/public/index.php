<?php
// backend/public/index.php
require_once __DIR__ . '/../app/Router.php';
require_once __DIR__ . '/../app/Support/FirebaseAuthenticator.php';
require_once __DIR__ . '/../app/Controllers/SessionController.php';
require_once __DIR__ . '/../app/Controllers/ScoreController.php';
require_once __DIR__ . '/../app/Controllers/RankingController.php';
require_once __DIR__ . '/../app/Controllers/UserController.php';
require_once __DIR__ . '/../app/Services/SessionService.php';
require_once __DIR__ . '/../app/Services/ScoreService.php';
require_once __DIR__ . '/../app/Services/RankingService.php';
require_once __DIR__ . '/../app/Services/UserService.php';
require_once __DIR__ . '/../app/Repositories/SessionRepository.php';
require_once __DIR__ . '/../app/Repositories/ScoreRepository.php';
require_once __DIR__ . '/../app/Repositories/RankingRepository.php';
require_once __DIR__ . '/../app/Repositories/UserRepository.php';
require_once __DIR__ . '/../src/FirestoreRepository.php';

// --- 2. CORS設定 ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// 3. ルーター生成と定義
$router = new Router();

$router->post('/api/session/start', function () {
    $repo = new SessionRepository();
    $service = new SessionService($repo);
    $controller = new SessionController($service);
    $controller->startSession();
});

$router->post('/api/score', function () {
    $scoreRepo = new ScoreRepository();
    $sessionRepo = new SessionRepository();
    $userRepo = new UserRepository();
    $service = new ScoreService($scoreRepo, $sessionRepo, $userRepo);
    $controller = new ScoreController($service);
    $controller->submitScore();
});

// ランキング取得（認証不要・公開情報として扱う）
$router->get('/api/ranking', function () {
    $repo = new RankingRepository();
    $service = new RankingService($repo);
    $controller = new RankingController($service);
    $controller->getRanking();
});

// プロフィール取得（初回アクセス時は自動作成）
$router->get('/api/profile', function () {
    $repo = new UserRepository();
    $service = new UserService($repo);
    $controller = new UserController($service);
    $controller->getProfile();
});

// プロフィール更新（表示名の変更）
$router->patch('/api/profile', function () {
    $repo = new UserRepository();
    $service = new UserService($repo);
    $controller = new UserController($service);
    $controller->updateProfile();
});

// 4. 実行
$router->dispatch();
