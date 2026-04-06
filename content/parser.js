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
        const mm = text.match(/^\[\*\(\s*(20\d{2})\.(\d{2})\.(\d{2})/);
        if (mm) {
            cur = `${mm[1]}.${mm[2]}.${mm[3]}`;
            days[cur] = line.id;
            snippets[cur] = [];
            continue;
        }
        text = text.replace(/\[[^\]]+\.icon\]/g, '').trim();
        if (cur && text && !text.startsWith('#') && !text.startsWith('>') &&
            !text.startsWith('[https://') && !text.startsWith('[[https://') &&
            !text.startsWith('[| ') && snippets[cur].length < CALENDAR_SNIPPET_LIMIT) {
            snippets[cur].push(text);
        }
    }
    return { days, snippets };
};

/* --- 質問抽出（議事録・論文紹介・発表練習で共通） --- */
/* 指定行範囲から質問行を抽出する（アイコン→userId→不明の順で著者推定） */
const collectQuestions = (lines, start, end, { seen = new Set() } = {}) => {
    const qs = [];

    for (let i = start; i <= end; i++) {
        const t = lines[i].text;
        if (!/^\?\s+/.test(t)) continue;

        const q = t.replace(/^\?\s+/, '').trim();
        const key = q.replace(/\s+/g, ' ');
        if (seen.has(key)) continue;
        seen.add(key);

        /* 著者推定: アイコン記法 → 行のuserId(userNameCache経由) → null */
        let author = findAuthorAbove(lines, i);
        if (!author && lines[i].uid && lines[i].uid !== 'unknown') {
            author = userNameCache[lines[i].uid] || null;
        }

        qs.push({ id: lines[i].id, text: q, author });
    }
    return qs;
};
