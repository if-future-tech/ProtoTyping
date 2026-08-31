<?php
// app/Repositories/SessionRepository.php

/**
 * セッションデータの永続化を管理するリポジトリ
 * 実際の Firestore 通信は FirestoreRepository に委譲する。
 * (ScoreRepository と同じ設計パターンに揃えている)
 */
class SessionRepository
{
    private FirestoreRepository $firestore;

    public function __construct()
    {
        // 記録用プロジェクト: prototyping-486508 (Nativeモード)
        $this->firestore = new FirestoreRepository('prototyping-486508', '(default)');
    }

    /**
     * セッション開始をFirestoreへ保存
     *
     * データフロー図解：本編 3.1「サーバー時刻で startedAt を確定」に対応。
     */
    public function create(string $sessionId, string $userId, string $category, string $startedAt): void
    {
        $fields = [
            'id'         => $sessionId,
            'user_id'    => $userId,
            'category'   => $category,
            'started_at' => $startedAt, // ISO8601形式 -> timestampValueとして処理される
        ];

        $this->firestore->createDocument('sessions', $sessionId, $fields);
    }

    /**
     * sessionIdからセッションを取得する。
     * スコア送信時の「セッション所有者確認」(34章)に利用する。
     */
    public function find(string $sessionId): ?array
    {
        return $this->firestore->getDocument('sessions', $sessionId);
    }

    /**
     * セッションを終了状態にする（finished_atを確定）。
     *
     * 本編13章「同時にsessionsの終了時刻を更新する」に対応。
     * これまで実装が漏れていたため、finished_atが永遠にNULLのままだった。
     */
    public function finish(string $sessionId, string $finishedAt): void
    {
        $this->firestore->updateDocument('sessions', $sessionId, [
            'finished_at' => $finishedAt,
        ]);
    }
}
