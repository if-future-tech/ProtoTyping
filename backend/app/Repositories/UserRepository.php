<?php
// backend/app/Repositories/UserRepository.php

/**
 * ユーザープロフィールの永続化を管理するリポジトリ
 * Firebase AuthのUIDをドキュメントIDとして扱う（17章: UIDをユーザー識別の基準とする）
 */
class UserRepository
{
    private FirestoreRepository $firestore;

    public function __construct()
    {
        // 記録用プロジェクト: prototyping-486508 (Nativeモード)
        $this->firestore = new FirestoreRepository('prototyping-486508', '(default)');
    }

    /**
     * uidからユーザープロフィールを取得。存在しない場合はnull。
     */
    public function findByUid(string $uid): ?array
    {
        return $this->firestore->getDocument('users', $uid);
    }

    /**
     * 初回利用者としてユーザーを作成する（19.1: users/{uid}）
     */
    public function create(string $uid, ?string $email, string $displayName, string $createdAt): void
    {
        $fields = [
            'display_name' => $displayName,
            'created_at' => $createdAt,
        ];

        if ($email) {
            $fields['email'] = $email;
        }

        $this->firestore->createDocument('users', $uid, $fields);
    }

    /**
     * 表示名を更新する
     */
    public function updateDisplayName(string $uid, string $displayName): void
    {
        $this->firestore->updateDocument('users', $uid, [
            'display_name' => $displayName,
        ]);
    }
}
