<?php
// app/Support/FirebaseAuthenticator.php

/**
 * Firebase ID Token の検証と uid/email 抽出を担当する共通クラス。
 * SDKを使わず、Firebase Auth REST API (accounts:lookup) を利用する。
 */
class FirebaseAuthenticator
{
    /**
     * Authorizationヘッダーの生文字列から "Bearer " を除いた IDトークンを取り出す
     *
     * Apache(mod_php)環境では $_SERVER['HTTP_AUTHORIZATION'] が
     * デフォルトで空になることがあるため（Authorizationヘッダーが渡されない既知の問題）、
     * getallheaders() からのフォールバックも試みる。
     * 恒久対処として public/.htaccess 側でもヘッダー転送ルールを追加している（二重の防御）。
     */
    public static function extractToken(): string
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (!$authHeader && function_exists('getallheaders')) {
            foreach (getallheaders() as $key => $value) {
                if (strcasecmp($key, 'Authorization') === 0) {
                    $authHeader = $value;
                    break;
                }
            }
        }

        return str_replace('Bearer ', '', $authHeader);
    }

    /**
     * IDトークンを検証し、uid と email を返す。
     * トークンが無い/無効な場合は uid: 'guest', email: null を返す。
     *
     * 失敗時はCloud Loggingで原因を追えるよう error_log に理由を残す
     * （以前は @file_get_contents で失敗が完全に握りつぶされていたため、
     * 　APIキー制限等の設定ミスに気づけなかった経緯がある）。
     */
    public static function verify(string $idToken): array
    {
        if (!$idToken) {
            error_log('[FirebaseAuthenticator] ID Tokenが空です（Authorizationヘッダーが届いていない可能性。.htaccessのヘッダー転送設定を確認）');
            return ['uid' => 'guest', 'email' => null];
        }

        $apiKey = getenv('FIREBASE_API_KEY');
        if (!$apiKey) {
            error_log('[FirebaseAuthenticator] FIREBASE_API_KEY 環境変数が未設定です');
            return ['uid' => 'guest', 'email' => null];
        }

        $url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={$apiKey}";

        $options = ['http' => [
            'method'        => 'POST',
            'header'        => 'Content-Type: application/json',
            'content'       => json_encode(['idToken' => $idToken]),
            'ignore_errors' => true
        ]];

        $res = @file_get_contents($url, false, stream_context_create($options));
        if ($res === false) {
            $error = error_get_last();
            error_log('[FirebaseAuthenticator] accounts:lookup への通信に失敗: ' . ($error['message'] ?? 'unknown error'));
            return ['uid' => 'guest', 'email' => null];
        }

        $data = json_decode($res, true);
        $user = $data['users'][0] ?? null;

        if (!$user) {
            // Googleからのエラーレスポンス（APIキー制限、トークン無効等）をそのままログに残す
            error_log('[FirebaseAuthenticator] accounts:lookup 検証失敗レスポンス: ' . $res);
            return ['uid' => 'guest', 'email' => null];
        }

        return [
            'uid'   => $user['localId'] ?? 'guest',
            'email' => $user['email'] ?? null,
        ];
    }

    /**
     * IDトークンを検証し、UIDのみを返す。
     * (SessionController / ScoreController は uid だけ分かれば良いため、こちらを利用)
     */
    public static function verifyAndGetUid(string $idToken): string
    {
        return self::verify($idToken)['uid'];
    }
}
