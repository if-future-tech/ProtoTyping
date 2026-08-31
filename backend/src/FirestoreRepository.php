<?php

/**
 * Firestore REST API 接続管理クラス
 * 型の不整合（Display Misalignment）を防ぐため、PHPの型をFirestoreの型へ自動変換します。
 */
class FirestoreRepository
{
    private string $baseUrl;
    private ?string $accessToken = null;

    public function __construct(
        private string $projectId = 'prototyping-486508',
        private string $databaseId = '(default)'
    ) {
        // 基本となるエンドポイントURL
        $this->baseUrl = "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/{$this->databaseId}/documents";
    }

    /**
     * アクセストークンの取得（Metadata Server または gcloud）
     */
    private function getAccessToken(): string
    {
        if ($this->accessToken) return $this->accessToken;

        // 1. Cloud Run / GCE 環境 (Metadata Server)
        $url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
        $context = @stream_context_create(['http' => ['header' => "Metadata-Flavor: Google\r\n", 'timeout' => 1]]);
        $json = @file_get_contents($url, false, $context);

        if ($json) {
            $data = json_decode($json, true);
            if (!empty($data['access_token'])) {
                return $this->accessToken = $data['access_token'];
            }
        }

        // 2. Cloud Shell / ローカル環境 (gcloud fallback)
        $token = trim((string)shell_exec('gcloud auth print-access-token'));
        return $this->accessToken = $token;
    }

    /**
     * ドキュメントの作成 (POST)
     */
    public function createDocument(string $collection, string $documentId, array $fields): array
    {
        $url = "{$this->baseUrl}/{$collection}?documentId={$documentId}";
        $payload = ['fields' => $this->formatFields($fields)];
        return $this->sendRequest('POST', $url, $payload);
    }

    /**
     * ドキュメントの取得 (GET)
     */
    public function getDocument(string $collection, string $documentId): ?array
    {
        $url = "{$this->baseUrl}/{$collection}/{$documentId}";
        $response = $this->sendRequest('GET', $url);

        if (isset($response['error'])) return null;
        return $this->parseFields($response['fields'] ?? []);
    }

    /**
     * ドキュメントの部分更新 (PATCH)
     *
     * updateMask.fieldPaths を指定することで、渡したフィールドのみを
     * 更新し、既存の他フィールドを消さないようにする。
     * (例: session の finished_at だけを後から更新する用途)
     */
    public function updateDocument(string $collection, string $documentId, array $fields): array
    {
        $maskParams = implode('&', array_map(
            fn($key) => 'updateMask.fieldPaths=' . urlencode($key),
            array_keys($fields)
        ));

        $url = "{$this->baseUrl}/{$collection}/{$documentId}?{$maskParams}";
        $payload = ['fields' => $this->formatFields($fields)];
        return $this->sendRequest('PATCH', $url, $payload);
    }

    /**
     * 並び替え・件数制限・(任意で)等価フィルタ付きのクエリを実行する。
     *
     * ドキュメント単純取得 (getDocument) では orderBy / limit が使えないため、
     * ランキングのような「上位N件を取得する」用途では
     * Firestore REST API の構造化クエリ (runQuery) を利用する。
     */
    public function runQuery(
        string $collection,
        string $orderByField,
        string $direction = 'DESCENDING',
        int $limit = 10,
        ?string $whereField = null,
        mixed $whereValue = null
    ): array {
        $structuredQuery = [
            'from'    => [['collectionId' => $collection]],
            'orderBy' => [[
                'field'     => ['fieldPath' => $orderByField],
                'direction' => $direction,
            ]],
            'limit' => $limit,
        ];

        if ($whereField !== null && $whereValue !== null) {
            $structuredQuery['where'] = [
                'fieldFilter' => [
                    'field' => ['fieldPath' => $whereField],
                    'op'    => 'EQUAL',
                    'value' => $this->formatSingleValue($whereValue),
                ],
            ];
        }

        $url = "{$this->baseUrl}:runQuery";
        $response = $this->sendRequest('POST', $url, ['structuredQuery' => $structuredQuery]);

        if (isset($response['error'])) {
            return [];
        }

        $results = [];
        foreach ($response as $item) {
            // 該当なしの場合、Firestoreは document キーの無い要素を返すことがあるためスキップ
            if (!isset($item['document'])) continue;

            $name = $item['document']['name'] ?? '';
            $id = basename($name);

            $results[] = array_merge(
                ['id' => $id],
                $this->parseFields($item['document']['fields'] ?? [])
            );
        }

        return $results;
    }

    /**
     * 単一の値を Firestore の Value型 に変換する（フィルタ条件用）
     */
    private function formatSingleValue(mixed $value): array
    {
        return $this->formatFields(['_' => $value])['_'];
    }

    /**
     * PHPの型を Firestore REST API 形式 (Value型) に変換
     */
    private function formatFields(array $fields): array
    {
        $formatted = [];
        foreach ($fields as $key => $value) {
            if (is_int($value)) {
                $formatted[$key] = ['integerValue' => (string)$value];
            } elseif (is_float($value)) {
                $formatted[$key] = ['doubleValue' => (float)$value];
            } elseif (is_bool($value)) {
                $formatted[$key] = ['booleanValue' => $value];
            } elseif (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $value)) {
                // ISO8601形式の文字列は timestampValue として扱う
                $formatted[$key] = ['timestampValue' => $value];
            } else {
                $formatted[$key] = ['stringValue' => (string)$value];
            }
        }
        return $formatted;
    }

    /**
     * Firestore の構造を PHP の連想配列に変換
     */
    private function parseFields(array $fields): array
    {
        $parsed = [];
        foreach ($fields as $key => $valueObj) {
            $type = array_key_first($valueObj);
            $val = $valueObj[$type];

            $parsed[$key] = match($type) {
                'integerValue' => (int)$val,
                'doubleValue'  => (float)$val,
                'booleanValue' => (bool)$val,
                default        => $val,
            };
        }
        return $parsed;
    }

    /**
     * HTTP リクエスト送信
     */
    private function sendRequest(string $method, string $url, array $payload = []): array
    {
        $token = $this->getAccessToken();
        $options = [
            'http' => [
                'method'  => $method,
                'header'  => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $token
                ],
                'ignore_errors' => true
            ]
        ];

        if ($method !== 'GET') {
            $options['http']['content'] = json_encode($payload);
        }

        $context  = stream_context_create($options);
        $response = file_get_contents($url, false, $context);

        return json_decode($response, true) ?? [];
    }
}
