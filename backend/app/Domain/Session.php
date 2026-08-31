<?php
// backend/app/Domain/Session.php   

class Session
{
    private string $sessionId;
    private string $userId;
    private string $category;
    private string $startedAt;
    private ?string $finishedAt;

    public function __construct(array $data)
    {
        $this->sessionId = $data['id'] ?? bin2hex(random_bytes(8));
        $this->userId = $data['userId'] ?? $data['user_id'];
        $this->category = $data['category'];
        $this->startedAt = $data['startedAt'] ?? $data['started_at'];
        $this->finishedAt = $data['finishedAt'] ?? ($data['finished_at'] ?? null);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->sessionId,
            'userId' => $this->userId,
            'category' => $this->category,
            'startedAt' => $this->startedAt,
            'finishedAt' => $this->finishedAt,
        ];
    }

    public function getSessionId(): string
    {
        return $this->sessionId;
    }

    public function getUserId(): string
    {
        return $this->userId;
    }

    public function getCategory(): string
    {
        return $this->category;
    }

    public function getStartedAt(): string
    {
        return $this->startedAt;
    }

    public function getFinishedAt(): ?string
    {
        return $this->finishedAt;
    }

    public function setFinishedAt(string $finishedAt): void
    {
        $this->finishedAt = $finishedAt;
    }
}
