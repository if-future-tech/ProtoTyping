<?php
// backend/app/Controllers/RankingController.php

class RankingController
{
    public function __construct(private RankingService $service)
    {
    }

    public function getRanking(): void
    {
        try {
            // クエリパラメータ: ?category=programming&limit=20
            $category = $_GET['category'] ?? null;
            $limitParam = $_GET['limit'] ?? null;
            $limit = $limitParam !== null ? (int) $limitParam : null;

            $ranking = $this->service->getTopScores($category, $limit);

            echo json_encode([
                'ok' => true,
                'data' => $ranking,
            ]);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode([
                'ok' => false,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
