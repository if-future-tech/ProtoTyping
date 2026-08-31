<?php
// backend/app/Controllers/ScoreController.php
class ScoreController
{
    public function __construct(private ScoreService $service)
    {
    }

    public function submitScore(): void
    {
        try {
            // --- 認証の扉: IDトークンからUIDを取得（SessionControllerと共通処理） ---
            $idToken = FirebaseAuthenticator::extractToken();
            $userId = FirebaseAuthenticator::verifyAndGetUid($idToken);

            $body = json_decode(file_get_contents('php://input'), true) ?? [];

            // 業務ロジックへ委譲（セッション所有者確認・WPM計算・保存・finished_at更新）
            $result = $this->service->processAndSave($userId, $body);

            echo json_encode(['ok' => true, 'uid' => $userId, 'data' => $result]);
        } catch (Throwable $e) {
            // セッションが存在しない/他人のセッションを使おうとした等はここで400を返す
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        }
    }
}
