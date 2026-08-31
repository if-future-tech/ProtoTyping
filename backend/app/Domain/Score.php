<?php
// backend/app/Domain/Score.php

class Score
{
    private string $scoreId;
    private string $userId;
    private int $wpm;
    private float $accuracy;
    private string $createdAt;
    private string $categoryId;
    private ?string $displayName;

    public function __construct(array $data)
    {
        $this->scoreId = $data['scoreId'] ?? bin2hex(random_bytes(8));
        $this->userId = $data['userId'] ?? $data['user_id'];
        $this->wpm = (int) $data['wpm'];
        $this->accuracy = (float) $data['accuracy'];
        $this->createdAt = $data['createdAt'] ?? $data['created_at'];
        $this->categoryId = $data['categoryId'] ?? $data['category'];
        $this->displayName = $data['displayName'] ?? ($data['display_name'] ?? null);
    }

    public function toArray(): array
    {
        return [
            'scoreId' => $this->scoreId,
            'userId' => $this->userId,
            'wpm' => $this->wpm,
            'accuracy' => $this->accuracy,
            'createdAt' => $this->createdAt,
            'categoryId' => $this->categoryId,
            'displayName' => $this->displayName,
        ];
    }

    public function getScoreId(): string
    {
        return $this->scoreId;
    }

    public function getUserId(): string
    {
        return $this->userId;
    }

    public function getWpm(): int
    {
        return $this->wpm;
    }

    public function getAccuracy(): float
    {
        return $this->accuracy;
    }

    public function getCreatedAt(): string
    {
        return $this->createdAt;
    }

    public function getCategoryId(): string
    {
        return $this->categoryId;
    }

    public function getDisplayName(): ?string
    {
        return $this->displayName;
    }
}