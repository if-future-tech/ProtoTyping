<?php
// backend/app/Controllers/SessionController.php

class SessionController
{
    private SessionService $service;

    public function __construct(SessionService $service)
    {
        $this->service = $service;
    }

    public function startSession(): void
    {
        try {
            // --- 認証: IDトークンからUIDを取得（ScoreControllerと共通処理） ---
            $idToken = FirebaseAuthenticator::extractToken();
            $userId = FirebaseAuthenticator::verifyAndGetUid($idToken);

            $body = json_decode(file_get_contents('php://input'), true);

            $category = $body['category'] ?? null;
            if (!$category) {
                throw new InvalidArgumentException('category required');
            }

            $result = $this->service->createSession($category, $userId);

            echo json_encode([
                'ok' => true,
                'uid' => $userId,
                'data' => $result
            ]);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode([
                'ok' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
}
