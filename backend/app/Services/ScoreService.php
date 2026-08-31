<?php
// backend/app/Services/ScoreService.php
class ScoreService
{
    public function __construct(
        private ScoreRepository $scoreRepo,
        private SessionRepository $sessionRepo,
        private UserRepository $userRepo
    ) {
    }

    public function processAndSave(string $userId, array $rawData): array
    {
        $sessionId = $rawData['sessionId'] ?? null;
        if (!$sessionId) {
            throw new InvalidArgumentException('sessionId required');
        }

        // --- セッションの正当性・所有者確認（34章: セッション所有者確認） ---
        // 他人のsessionIdでスコアを送りつけられる状態は、そのままランキング汚染に
        // 直結するため、ここで必ず検証する。
        $session = $this->sessionRepo->find($sessionId);
        if (!$session) {
            throw new RuntimeException('session not found');
        }
        if (($session['user_id'] ?? null) !== $userId) {
            throw new RuntimeException('session does not belong to this user');
        }

        // 1. 計算
        $totalTyped = (int) ($rawData['totalTyped'] ?? 0);
        $missCount = (int) ($rawData['missCount'] ?? 0);
        $elapsedMs = (int) ($rawData['elapsedMs'] ?? 1); // 0除算防止

        // WPM (Words Per Minute): 一般的な定義として「5文字で1ワード」として計算
        // (総タイプ数 / 5) / (ミリ秒 / 60000)
        $wpm = ($totalTyped / 5) / ($elapsedMs / 60000);

        // 精度
        $accuracy = 0;
        if ($totalTyped > 0) {
            $accuracy = (1 - ($missCount / $totalTyped)) * 100;
        }

        // プロフィールが存在すれば表示名をランキング用に同梱する（無ければ null のまま）
        $profile = $this->userRepo->findByUid($userId);
        $displayName = $profile['display_name'] ?? null;

        $processedData = [
            'sessionId' => $sessionId,
            // ランキングをカテゴリ別に集計・表示できるよう、sessionのcategoryを非正規化コピー
            'category' => $session['category'] ?? null,
            'displayName' => $displayName,
            'wpm' => (int) round($wpm),
            'accuracy' => (float) round($accuracy, 1),
            'totalTyped' => $totalTyped,
            'missCount' => $missCount
        ];

        // 2. Repository を通じて保存
        $this->scoreRepo->save($userId, $processedData);

        // 3. セッション終了処理（本編13章: sessionsのfinished_atを更新してクローズする）
        $this->sessionRepo->finish($sessionId, gmdate('c'));

        return $processedData;
    }
}
