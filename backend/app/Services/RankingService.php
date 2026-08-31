<?php
// app/Services/RankingService.php

class RankingService
{
    // 無制限にlimitを受け付けるとFirestore読み取りコストが青天井になるため上限を設ける
    private const DEFAULT_LIMIT = 10;
    private const MAX_LIMIT = 50;

    public function __construct(private RankingRepository $repo) {}

    public function getTopScores(?string $category, ?int $limit): array
    {
        $limit = $limit ?? self::DEFAULT_LIMIT;
        if ($limit < 1) {
            $limit = self::DEFAULT_LIMIT;
        }
        if ($limit > self::MAX_LIMIT) {
            $limit = self::MAX_LIMIT;
        }

        $rows = $this->repo->topByWpm($limit, $category);

        // レスポンス整形：順位(rank)を付与し、Firestore固有のキー(id等)は隠蔽する
        //
        // display_nameはプロフィール作成済みのユーザーのみ保存されている。
        // 未作成のスコア（プロフィール機能導入前の記録、またはguestでの送信）は
        // userIdの先頭部分をフォールバック表示する。
        $ranking = [];
        $rank = 1;
        foreach ($rows as $row) {
            $userId = $row['userId'] ?? 'guest';
            $fallbackName = $userId !== 'guest' ? substr($userId, 0, 8) : 'ゲスト';

            $ranking[] = [
                'rank'        => $rank++,
                'userId'      => $userId,
                'displayName' => $row['display_name'] ?? $fallbackName,
                'wpm'         => $row['wpm'] ?? 0,
                'accuracy'    => $row['accuracy'] ?? 0,
                'category'    => $row['category'] ?? null,
            ];
        }

        return $ranking;
    }
}
