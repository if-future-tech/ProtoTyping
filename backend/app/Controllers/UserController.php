<?php
// backend/app/Controllers/UserController.php

class UserController
{
    public function __construct(private UserService $service)
    {
    }

    /**
     * GET /api/profile
     * 自分のプロフィールを取得する。初回アクセス時は自動的に作成する。
     */
    public function getProfile(): void
    {
        try {
            $idToken = FirebaseAuthenticator::extractToken();
            $auth = FirebaseAuthenticator::verify($idToken);

            $profile = $this->service->getOrCreateProfile($auth['uid'], $auth['email']);

            echo json_encode(['ok' => true, 'data' => $profile]);
        } catch (Throwable $e) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    /**
     * PATCH /api/profile
     * 表示名を更新する。
     */
    public function updateProfile(): void
    {
        try {
            $idToken = FirebaseAuthenticator::extractToken();
            $uid = FirebaseAuthenticator::verifyAndGetUid($idToken);

            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            $profile = $this->service->updateProfile($uid, $body['displayName'] ?? null);

            echo json_encode(['ok' => true, 'data' => $profile]);
        } catch (InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        }
    }
}
