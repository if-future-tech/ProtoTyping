<?php
// app/Repositories/RankingRepository.php

/**
 * ランキング表示用にscoresコレクションを検索するリポジトリ
 */
class RankingRepository
{
    private FirestoreRepository $firestore;

    public function __construct()
    {
        // 記録用プロジェクト: prototyping-486508 (Nativeモード)
        $this->firestore = new FirestoreRepository('prototyping-486508', '(default)');
    }

    /**
     * wpmの降順で上位N件を取得する。
     * categoryを指定した場合はカテゴリ内ランキングに絞り込む。
     *
     * 注意: category指定での絞り込み + wpmでの並び替えを組み合わせる場合、
     * Firestore側で複合インデックス(composite index)の作成が必要になることがある。
     * 未作成の場合、Firestoreのエラーレスポンスにインデックス作成用リンクが含まれる。
     */
    public function topByWpm(int $limit, ?string $category = null): array
    {
        return $this->firestore->runQuery(
            collection: 'scores',
            orderByField: 'wpm',
            direction: 'DESCENDING',
            limit: $limit,
            whereField: $category ? 'category' : null,
            whereValue: $category
        );
    }
}
