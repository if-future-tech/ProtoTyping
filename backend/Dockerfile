FROM php:8.3-apache

# mod_rewriteを有効化
RUN a2enmod rewrite

# mbstring拡張を有効化
# UserService::updateProfile() で mb_strlen() を使用しており（日本語等マルチバイト表示名対応）、
# 公式PHPイメージにはデフォルトで含まれていないため明示的にインストールする。
RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev \
    && docker-php-ext-install mbstring \
    && apt-get purge -y --auto-remove libonig-dev \
    && rm -rf /var/lib/apt/lists/*

# Apacheのポートを80から8080に変更（Cloud Runの必須要件）
RUN sed -i 's/80/8080/g' /etc/apache2/ports.conf /etc/apache2/sites-available/000-default.conf

# ソースをコピー
COPY . /var/www/html/

# ドキュメントルートの設定を修正
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/000-default.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

# AllowOverride All を設定して .htaccess を有効化
RUN echo '<Directory /var/www/html/public>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' >> /etc/apache2/apache2.conf

# ポート8080を公開
EXPOSE 8080
