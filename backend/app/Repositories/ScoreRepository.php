<?php

/**
 * スコアデータの永続化を管理するリポジトリ
 * 実際の Firestore 通信は FirestoreRepository に委譲し、型安全な保存を実現します。
 */
class ScoreRepository
{
    private FirestoreRepository $firestore;

    public function __construct()
    {
        // 記録用プロジェクト: prototyping-486508 (Nativeモード)
        $this->firestore = new FirestoreRepository('prototyping-486508', '(default)');
    }

    /**
     * スコアを Firestore に保存
     */
    public function save(string $userId, array $data): void
    {
        $documentId = $data['sessionId'] ?? uniqid('score_');

        // FirestoreRepository の formatFields が PHP の型 (int/float) を自動で
        // integerValue / doubleValue に変換するため、不整合が発生しません。
        $fields = [
            'userId'     => $userId,
            'wpm'        => (int)$data['wpm'],
            'accuracy'   => (float)$data['accuracy'],
            'created_at' => date('c'), // ISO8601 -> timestampValue として処理される
            'sessionId'  => (string)$documentId
        ];

        // ランキングをカテゴリ別に絞り込めるよう、session側のcategoryをコピー（非正規化）
        if (!empty($data['category'])) {
            $fields['category'] = (string)$data['category'];
        }

        // ランキング表示時にusersとJOINしなくて済むよう、表示名もコピー（非正規化）
        // プロフィール未作成のユーザーの場合は保存しない（ランキング側でフォールバック表示する）
        if (!empty($data['displayName'])) {
            $fields['display_name'] = (string)$data['displayName'];
        }

        $this->firestore->createDocument('scores', $documentId, $fields);
    }
}
