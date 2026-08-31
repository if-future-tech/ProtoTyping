/**
 * 出題用データの取得と管理
 *
 * words.json を知っているのはこのファイルだけにする。
 * app.js は「カテゴリ一覧をくれ」「ランダムな1問をくれ」という形でしか
 * このファイルとやり取りしない（データの持ち方を app.js から隠蔽する）。
 */

let wordData = null;

/**
 * words.json を読み込む
 * 将来 API 化する場合も、この関数のインターフェースは維持する想定。
 */
function loadWordData() {
  return fetch('words.json')
    .then(res => res.json())
    .then(data => {
      wordData = data;
      return wordData;
    });
}

/**
 * カテゴリ一覧を返す
 */
function getCategories() {
  if (!wordData) return [];
  return wordData.categories;
}

/**
 * カテゴリIDからカテゴリ情報を返す
 */
function getCategoryById(categoryId) {
  if (!wordData) return null;
  return wordData.categories.find(c => c.id === categoryId) || null;
}

/**
 * 指定カテゴリからランダムで1件取得
 * データ未読み込み、または該当カテゴリが無い場合は null を返す。
 */
function getRandomWord(categoryId) {
  const category = getCategoryById(categoryId);
  if (!category || !category.words || category.words.length === 0) {
    return null;
  }
  return category.words[Math.floor(Math.random() * category.words.length)];
}
