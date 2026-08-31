<?php
// backend/app/Services/SessionService.php

class SessionService
{
    public function __construct(private SessionRepository $repo)
    {
    }

    /**
     * セッションを開始し、Firestoreへ正式な記録として保存する。
     *
     * これまでは sessionId/startedAt をその場で生成して返すだけで
     * DB保存を行っていなかった（引継資料 9.3, 19.2 との乖離）。
     * SessionRepository経由でFirestoreの sessions コレクションへ保存するよう修正。
     */
    public function createSession(string $category, string $userId): array
    {
        $sessionId = uniqid('sess_', true);
        $startedAt = gmdate('c');

        $this->repo->create($sessionId, $userId, $category, $startedAt);

        return [
            'sessionId' => $sessionId,
            'startedAt' => $startedAt,
        ];
    }
}
