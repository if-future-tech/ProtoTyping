<?php
// app/Services/UserService.php

class UserService
{
    private const MAX_DISPLAY_NAME_LENGTH = 20;

    public function __construct(private UserRepository $repo)
    {
    }

    /**
     * プロフィールを取得する。存在しない場合は「初回利用者」として自動作成する。
     *
     * 18章: 「事前登録されたユーザーだけを対象にする設計」ではなく、
     * 「初回利用者が自動的にユーザーとして利用開始できる設計」を採用する。
     */
    public function getOrCreateProfile(string $uid, ?string $email): array
    {
        if ($uid === 'guest') {
            throw new RuntimeException('authentication required');
        }

        $existing = $this->repo->findByUid($uid);
        if ($existing) {
            return $this->toResponse($uid, $existing);
        }

        $displayName = $this->defaultDisplayName($email);
        $createdAt = gmdate('c');

        $this->repo->create($uid, $email, $displayName, $createdAt);

        return $this->toResponse($uid, [
            'email' => $email,
            'display_name' => $displayName,
            'created_at' => $createdAt,
        ]);
    }

    /**
     * 表示名を更新する。プロフィールが未作成の場合はエラーとする
     * （先に GET /api/profile で自動作成されている前提）。
     */
    public function updateProfile(string $uid, ?string $displayName): array
    {
        if ($uid === 'guest') {
            throw new RuntimeException('authentication required');
        }

        $displayName = trim((string) $displayName);
        if ($displayName === '') {
            throw new InvalidArgumentException('displayName required');
        }
        if (mb_strlen($displayName) > self::MAX_DISPLAY_NAME_LENGTH) {
            throw new InvalidArgumentException('displayName must be ' . self::MAX_DISPLAY_NAME_LENGTH . ' characters or fewer');
        }

        $existing = $this->repo->findByUid($uid);
        if (!$existing) {
            throw new RuntimeException('profile not found. call GET /api/profile first');
        }

        $this->repo->updateDisplayName($uid, $displayName);

        $existing['display_name'] = $displayName;
        return $this->toResponse($uid, $existing);
    }

    /**
     * メールアドレスから初期表示名を組み立てる（例: taro@example.com -> taro）
     * メールが無い場合は汎用名にフォールバックする。
     */
    private function defaultDisplayName(?string $email): string
    {
        if ($email && str_contains($email, '@')) {
            return substr($email, 0, strpos($email, '@'));
        }
        return 'プレイヤー';
    }

    private function toResponse(string $uid, array $fields): array
    {
        return [
            'uid' => $uid,
            'displayName' => $fields['display_name'] ?? 'プレイヤー',
            'email' => $fields['email'] ?? null,
            'createdAt' => $fields['created_at'] ?? null,
        ];
    }
}
