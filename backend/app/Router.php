<?php
// app/Router.php

class Router
{
    private array $routes = [];

    public function post(string $path, callable $handler): void
    {
        $this->routes['POST'][$path] = $handler;
    }

    public function get(string $path, callable $handler): void
    {
        $this->routes['GET'][$path] = $handler;
    }

    public function patch(string $path, callable $handler): void
    {
        $this->routes['PATCH'][$path] = $handler;
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        // 前後のスラッシュをトリムして比較しやすくする（正規化）
        $uri = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

        // ルート登録側も trim して探すように変更
        foreach ($this->routes[$method] ?? [] as $path => $handler) {
            if (trim($path, '/') === $uri) {
                header('Content-Type: application/json');
                call_user_func($handler);
                return;
            }
        }

        // 見つからない場合
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => "Not Found: $uri"]);
    }
}
