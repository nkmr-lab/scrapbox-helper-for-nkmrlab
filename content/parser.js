/* ================= テキスト解析ユーティリティ ================= */

/* 生のScrapbox行データを正規化する */
const normalizeLines = (rawLines, { withUid = false } = {}) => {
    return rawLines.map(l => {
        const line = {
            id: l.id,
            text: (l.text || '').trim()
        };
        if (withUid) {
            line.uid = l.userId || l.createdBy || l.updatedBy || 'unknown';
        }
        return line;
    });
};

/* --- 日付フォーマット --- */
const formatYm = (date) => {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatYmd = (date) => {
    return `${formatYm(date)}.${String(date.getDate()).padStart(2, '0')}`;
};

/* 研究ノートの日付ヘッダ `[*( YYYY.MM.DD ...)]` を検出する正規表現
   match[1]=YYYY, match[2]=MM, match[3]=DD */
const DATE_HEADER_RE = /^\[\*\(\s*(20\d{2})\.(\d{2})\.(\d{2})/;

/* ページ名内の年月部分 `YYYY.MM` を別の年月に置き換える（研究ノート系ページ名で頻用） */
const pageNameWithYM = (pageName, ym) => pageName.replace(/20\d{2}\.\d{2}/, ym);

/* --- Scrapbox bracket 記法のパース ---
   `[* text]` `[*& text]` `[** text]` 等 → bold （* を含むなら太字扱い）
   `[label url]` / `[url label]` → 平文（label部分のみ）
   `[label]` （URLなし）→ 平文（中身のみ）
   画像URL（gyazo or 拡張子）→ image */
const _SB_DECORATOR_RE = /^([*\/\-_$&]+)\s+(.+)$/;
const _SB_IMG_URL_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(?:[?#]\S*)?$/i;
const _SB_GYAZO_RE = /^https?:\/\/(?:www\.)?gyazo\.com\/([a-z0-9]+)(?:[\/?#].*)?$/i;
const _SB_URL_RE = /^https?:\/\/\S+$/;

/* `[内容]` の中身トークンが画像URLなら表示用URL（gyazoはthumb/1000）を返す */
const bracketTokenToImageUrl = (token) => {
    const g = token.match(_SB_GYAZO_RE);
    if (g) return `https://gyazo.com/${g[1]}/thumb/1000`;
    if (_SB_IMG_URL_RE.test(token)) return token;
    return null;
};

/* `[内容]` の中身を解析する。返り値:
   - {type:'image', url}
   - {type:'styled', text, styles:{bold,strike,underline,italic}}  装飾あり
   - {type:'plain', text}                                            装飾なし */
const parseSbBracket = (inner) => {
    const trimmed = inner.trim();
    const tokens = trimmed.split(/\s+/);

    /* 中身に画像URLが含まれていれば画像扱い */
    for (const tok of tokens) {
        const imgUrl = bracketTokenToImageUrl(tok);
        if (imgUrl) return { type: 'image', url: imgUrl };
    }

    /* 装飾 [* text] [*& text] [** text] [- text] [_ text] [/ text] 等 */
    const dec = trimmed.match(_SB_DECORATOR_RE);
    if (dec) {
        const d = dec[1];
        const styles = {
            bold:      d.includes('*'),
            strike:    d.includes('-'),
            underline: d.includes('_'),
            italic:    d.includes('/'),
        };
        const hasStyle = styles.bold || styles.strike || styles.underline || styles.italic;
        return hasStyle
            ? { type: 'styled', text: dec[2], styles }
            : { type: 'plain', text: dec[2] };
    }

    /* 複数トークン: ラベル付きリンク [text url] / [url text] → label のみ */
    if (tokens.length >= 2) {
        const labels = tokens.filter(t => !_SB_URL_RE.test(t));
        if (labels.length) return { type: 'plain', text: labels.join(' ') };
    }

    /* 単一トークン: [text] 内部リンク or [https://...] */
    return { type: 'plain', text: trimmed };
};

/* Scrapbox記法を平文化する（カレンダー snippet 等のテキスト表示用、画像は省略）。
   `[[...]]` も `[...]` 同様に処理する */
const stripSbMarkup = (text) => text.replace(/\[\[([^\]]+)\]\]|\[([^\]]+)\]/g, (_, dbl, sgl) => {
    const p = parseSbBracket(dbl || sgl);
    return p.type === 'image' ? '' : p.text;
});

/* --- ページ種別判定 --- */
const PAGE_TYPES = {
    'research-note':   /研究ノート/,
    'experiment-plan': /実験計画書/,
    'presentation':    /発表練習/,
    'minutes':         /議事録/,
};

/* ページ名からページ種別を判定する */
const classifyPageByName = (pageName) => {
    if (!pageName) return 'project-top';
    for (const [type, pattern] of Object.entries(PAGE_TYPES)) {
        if (pattern.test(pageName)) return type;
    }
    return 'unknown';
};

const isPaperIntroPage = (lines) =>
    lines.some(line => (line.text || '').includes('#論文紹介'));

/* --- Scrapbox記法パース --- */
const isContextBoundary = (text) => {
    if (!text) return true;
    if (/^\[\*+\s/.test(text)) return true;
    return false;
};

/* テキストからアイコン記法のユーザー名を抽出する */
const extractIconName = (text) => {
    const m = text.match(/^\[([^\]\/]+)\.icon\]/);
    return m ? m[1] : null;
};

/* 指定行より上方にある直近のアイコン名を探す */
const findAuthorAbove = (lines, fromIndex) => {
    for (let i = fromIndex - 1; i >= 0; i--) {
        const text = lines[i].text;
        if (isContextBoundary(text)) break;
        const name = extractIconName(text);
        if (name) return name;
    }
    return null;
};

/* ブラケット記法の装飾付きタイトルをパースする */
const parseBracketTitle = (text) => {
    if (!text.startsWith('[')) return null;

    const m = text.match(/^\[([\*\(\&]+)\s+(.+?)]$/);
    if (!m) return null;

    const decorators = m[1];
    const title = m[2].trim();

    if (decorators === '*') return null;
    return title;
};

/* タイトル行かどうか判定する */
const isTitleLine = (t) =>
    !!parseBracketTitle(t) || /^タイトル\s*[:：『「]/.test(t);

/* タイトル行からタイトル文字列を抽出・整形する */
const cleanTitle = (t) => {
    const parsed = parseBracketTitle(t);
    if (parsed) return parsed;

    return t
        .replace(/^タイトル\s*[:：『「]\s*/, '')
        .replace(/[』」]\s*$/, '')
        .trim();
};

/* セッション開始行かどうかを判定する */
const isSessionStart = (t) => {
    const title = parseBracketTitle(t);
    return title && t.includes('(');
};

/* --- カレンダーデータ抽出 --- */
/* 研究ノートの行データからカレンダー用の日付・スニペットを抽出する */
const parseCalendarData = (rawLines) => {
    const days = {}, snippets = {};
    let cur = null;

    for (const line of rawLines) {
        let text = (line.text || '').trim();
        const mm = text.match(DATE_HEADER_RE);
        if (mm) {
            cur = `${mm[1]}.${mm[2]}.${mm[3]}`;
            /* 同じ日付ヘッダが複数回出てきても上書きしない（2回目以降は追記） */
            if (!days[cur]) days[cur] = line.id;
            if (!snippets[cur]) snippets[cur] = [];
            continue;
        }
        text = text.replace(/\[[^\]]+\.icon\]/g, '').trim();
        if (cur && text && !text.startsWith('#') && !text.startsWith('>') &&
            !text.startsWith('[https://') && !text.startsWith('[[https://') &&
            !text.startsWith('[| ') && snippets[cur].length < CALENDAR_SNIPPET_LIMIT) {
            const cleaned = stripSbMarkup(text).trim();
            if (cleaned) snippets[cur].push(cleaned);
        }
    }
    return { days, snippets };
};

/* --- 質問抽出（議事録・論文紹介・発表練習で共通） --- */
/* 指定行範囲から質問行を抽出する（著者推定: 上位アイコンslug→displayName化 → uidからdisplayName解決 → null） */
const collectQuestions = (lines, start, end, { seen = new Set() } = {}) => {
    const qs = [];

    for (let i = start; i <= end; i++) {
        const t = lines[i].text;
        if (!/^\?\s+/.test(t)) continue;

        const q = t.replace(/^\?\s+/, '').trim();
        const key = q.replace(/\s+/g, ' ');
        if (seen.has(key)) continue;
        seen.add(key);

        let author = findAuthorAbove(lines, i);
        if (author) {
            author = resolveDisplayBySlug(author);
        } else if (lines[i].uid && lines[i].uid !== 'unknown') {
            author = resolveUserName(lines[i].uid);
        }

        qs.push({ id: lines[i].id, text: q, author });
    }
    return qs;
};
