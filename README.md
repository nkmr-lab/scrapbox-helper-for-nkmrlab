# Labo Scrapbox Helper

研究室の Scrapbox をめちゃ使いやすくする Chrome 拡張。

## 機能

### 研究ノート
- 自分の研究ノートへの直リンク
- 月カレンダー表示（ヒートマップ・拡大表示対応）
- 前月/次月/今月へワンクリック移動
- 当月ノートの今日の日付へ自動ジャンプ
- まだ存在しない月のノートをワンクリック作成
- TODO マーク `[_]` / 完了マーク `[x]` で TODO リスト自動生成

### 議事録
- セッション・発表タイトルへのジャンプ
- 質問 `? ` の自動抽出（質問者の自動検出付き）
- 感想の収集（複数行対応）
- AI 要約（OpenAI API）
- 発言量の統計グラフ

### 論文紹介
- `#論文紹介` タグのあるページを自動検出
- `[*** 質問・コメント]` セクションから質問を抽出
- 発言量の統計グラフ

### 発表練習
- `タイトル:` 行でセッション分割
- セッションごとの質問抽出（重複排除）
- 発言量の統計グラフ

### 実験計画書
- セクション・項目のアウトライン表示
- GPT によるセクション単位レビュー（一括 / 個別）

### フロートメニュー（全ページ共通）
- ピン留め（ページのブックマーク）
- よく見ているページ / 最近見たページ
- ページ生成（研究ノート / 発表練習 / 論文紹介 / 学会プログラムからAI変換）
- 設定モーダル

### ページレイアウト
- ページ本文の整列（中央 / 左寄せ / 右寄せ）— 個別ページのみ適用、トップページは中央固定
- カレンダー/フロートメニュー位置に応じて Scrapbox 純正 `.page-menu` を自動退避（衝突回避）

### 発言者解決
- Scrapbox API の `collaborators` から uid→表示名を一括解決（60秒スロットル）
- アイコン記法からの投票方式フォールバック（ページ単位で1票、最多得票を正式名に採用）

### 設定（タブ式モーダル）
- 基本: 名前、透明度、テーマ（ノーマル/ダーク）、カスタムカラー
- 表示: フロートメニュー位置・幅、ページ整列、最近/よく見るページ表示件数
- メイン/カレンダー/TODO/その他: パネル位置（4隅）・サイズ個別設定
- AIサポート: OpenAI API Key、プロンプトのカスタマイズ
- 同期: 項目カテゴリごとに chrome.storage.sync と local を切り替え

## インストール

1. このリポジトリを clone または ZIP ダウンロード
2. Chrome で `chrome://extensions` を開く
3. 「デベロッパーモード」を ON
4. 「パッケージ化されていない拡張機能を読み込む」からフォルダを選択

## 権限

- `storage` のみ（設定・履歴・ピン留めの保存に使用）

## アーキテクチャ

### MVE分離
- **Style** (`style.js`): `<style>`タグ注入。CSSクラス + CSS変数でテーマ管理
- **View** (`view.js`): DOM生成関数。className付与のみ
- **Logic** (parser.js, api.js, 各ページハンドラ): データ解析・API・描画オーケストレーション

### グローバル状態
すべてのファイルはcontent scriptとして同一スコープで実行されます。
- `currentProjectName` — 現在のプロジェクト名（複数ファイルから参照、router.jsで設定）
- `_closedPanels` — ユーザーが閉じたパネルID（view.jsで管理）
- `_calendarExpanded` — カレンダーの拡大/縮小状態（calendar.jsで管理）
- `_settingsCache` — 設定のメモリキャッシュ（config.jsで管理）
- `_userNameCache` / `_userNameCacheLoaded` — uid→名前の投票キャッシュ（stats.jsで管理）
- `_aiCache` — AI結果キャッシュ（api.jsで管理、ページ遷移でクリア）

### 読み込み順序（manifest.json）
ファイルは以下の順で読み込まれます。**順序に意味があります**。
```
 1. constants.js       ← 定数・グローバル状態（全ファイルが参照）
 2. style.js           ← CSSテーマ・スタイルシート注入
 3. config.js          ← 設定の読み書き・applyPanelSettings・applyPageAlign
 4. view.js            ← DOM生成ユーティリティ（config.jsのapplyPanelSettingsを使用）
 5. parser.js          ← テキスト解析（DOM非依存）
 6. api.js             ← API呼び出し（config.jsのloadSettingsを使用）
 7. pagewatcher.js     ← ページ変更検知クラス
 8. stats.js           ← 発言量統計 + collaborators/投票による発言者解決
 9. pin.js             ← ピン留め機能
10. history.js         ← 閲覧履歴
11. top_page.js        ← トップページ描画
12. research_note.js   ← 研究ノートのページ判定・カレンダー上UI
13. calendar.js        ← カレンダーパネル
14. todo.js            ← TODOパネル
15. experiment.js      ← 実験計画書パネル
16. minutes.js         ← 議事録パネル
17. paper_intro.js     ← 論文紹介パネル
18. presentation.js    ← 発表練習パネル
19. settings_ui.js     ← 設定モーダル（タブ式UIビルダー）
20. page_create.js     ← テンプレート・ページ生成モーダル（12,17,18の関数を使用）
21. float_menu.js      ← フロートメニュー
22. watcher_manager.js ← Watcher管理（各ページハンドラの描画関数を参照）
23. router.js          ← SPAルーティング
24. main.js            ← エントリポイント
```

## ファイル構成

```
content/
├── constants.js       定数・ID・ストレージキー・グローバル状態・レイアウト定数
├── style.js           CSSテーマ定義 + <style>タグ注入
├── config.js          設定の読み書き + パネル/ページ整列の適用
├── view.js            DOM生成ユーティリティ（Viewレイヤー）
├── parser.js          テキスト解析・ページ分類（Modelレイヤー）
├── api.js             Scrapbox API / OpenAI API / AIキャッシュ
├── pagewatcher.js     ETagベースのページ変更検知
├── stats.js           発言量統計・collaborators/投票によるユーザー名解決
├── pin.js             ピン留めのCRUD + 描画
├── history.js         閲覧履歴のCRUD + 描画
├── top_page.js        プロジェクトトップページ描画
├── research_note.js   研究ノートのページ判定 + カレンダー上の作成UI
├── calendar.js        月カレンダーパネル（ヒートマップ・拡大）
├── todo.js            TODOパネル（折りたたみ・位置追従）
├── experiment.js      実験計画書パネル + GPTレビュー
├── minutes.js         議事録パネル（セッション・質問・感想・AI要約）
├── paper_intro.js     論文紹介パネル（質問抽出・統計）
├── presentation.js    発表練習パネル（質問抽出・統計）
├── settings_ui.js     設定モーダル（タブ式UIビルダー）
├── page_create.js     テンプレート集約 + ページ生成モーダル + AI変換
├── float_menu.js      フロートメニュー（ピン留め・履歴・ボタン）
├── watcher_manager.js Watcher管理（PageWatcherインスタンスの保持・起動・停止）
├── router.js          SPAルーティング（URL変更検知・ページ種別振り分け）
└── main.js            エントリポイント（初期化・ルーター起動）
```

## 開発ガイド

### 新しいページ種別を追加するには

例: 「レポート」ページを追加する場合

1. **parser.js**: `PAGE_TYPES` に正規表現を追加
   ```js
   'report': /レポート/,
   ```

2. **report.js**: ページハンドラを作成（`renderReportFromLines(pageName, rawLines)` 関数）

3. **watcher_manager.js**: `watchers` オブジェクトにWatcher追加
   ```js
   report: new PageWatcher({ ... onInit/onUpdate で renderReportFromLines を呼ぶ })
   ```

4. **router.js**: `handlers` にルート追加
   ```js
   'report': (pj, pg) => watcherManager.start('report', pj, pg),
   ```

5. **manifest.json**: `report.js` をページハンドラ群の後（presentation.js の後、settings_ui.js の前）に追加

### 新しい設定項目を追加するには

1. **config.js** `DEFAULT_SETTINGS`: デフォルト値を追加
2. **settings_ui.js** `_build*Tab()`: 対応するタブビルダーに入力要素を追加
3. **settings_ui.js** `_collectSettingsValues()`: 引数リストと return に追加
4. 設定を使用するファイルで `loadSettings()` から値を取得

### 命名規則

| パターン | 用途 | 例 |
|---|---|---|
| `render*` | DOM要素/パネル/セクションを生成して返す（または定位置に描画） | `renderButton`, `renderStandardPanel`, `renderPanelHeader` |
| `append*(parent, ...)` | 要素を生成して第一引数の親ノードに追加する | `appendItem`, `appendCloseButton`, `appendStatsBlock` |
| `build*` | 内部用データ構造/CSS片を生成する（DOM非依存） | `buildTalkStats`, `buildPageAlignCss` |
| `generate*` | 文字列・URL・ページ本文テキストを生成する | `generateCreateNoteUrl`, `generateResearchNoteBody` |
| `apply*` | 既存DOMにスタイル/設定を適用する | `applyPanelSettings`, `applyPageAlign`, `applyTheme` |
| `parse*` / `collect*` / `extract*` | テキスト解析 | `parseSessions`, `collectQuestions`, `extractIconName` |
| `open*/close*` | モーダル・メニュー開閉 | `openSettingsModal`, `closeFloatMenu` |
| `is*` | boolean判定 | `isOpenAIEnabled`, `isPagePinned` |
| `load*` | chrome.storage 読込 | `loadSettings`, `loadPinnedPages` |
| `save*` | chrome.storage 書込 | `saveSettings` |
| `fetch*` | 外部API | `fetchPage` |
| `*_PANEL_ID` / 定数 | UPPER_SNAKE_CASE | `CALENDAR_PANEL_ID`, `TICK_INTERVAL` |
| `_xxx` | モジュール内プライベート状態/ヘルパー | `_closedPanels`, `_settingsCache`, `_buildBasicTab` |
