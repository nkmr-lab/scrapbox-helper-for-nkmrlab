/* ================= テキスト解析ユーティリティ ================= */

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

/* --- ページ判定 --- */
const isPaperIntroPage = (lines) =>
    lines.some(line => (line.text || '').includes('#論文紹介'));

/* --- Scrapbox記法パース --- */
const isContextBoundary = (text) => {
    if (!text) return true;
    if (/^\[\*+\s/.test(text)) return true;
    return false;
};

const extractIconName = (text) => {
    const m = text.match(/^\[([^\]\/]+)\.icon\]/);
    return m ? m[1] : null;
};

const findAuthorAbove = (lines, fromIndex) => {
    for (let i = fromIndex - 1; i >= 0; i--) {
        const text = lines[i].text;
        if (isContextBoundary(text)) break;
        const name = extractIconName(text);
        if (name) return name;
    }
    return null;
};

const parseBracketTitle = (text) => {
    if (!text.startsWith('[')) return null;

    const m = text.match(/^\[([\*\(\&]+)\s+(.+?)]$/);
    if (!m) return null;

    const decorators = m[1];
    const title = m[2].trim();

    if (decorators === '*') return null;
    return title;
};

const isTitleLine = (t) =>
    !!parseBracketTitle(t) || /^タイトル\s*[:：『「]/.test(t);

const cleanTitle = (t) => {
    const parsed = parseBracketTitle(t);
    if (parsed) return parsed;

    return t
        .replace(/^タイトル\s*[:：『「]\s*/, '')
        .replace(/[』」]\s*$/, '')
        .trim();
};

const isSessionStart = (t) => {
    const title = parseBracketTitle(t);
    return title && t.includes('(');
};

/* --- 質問抽出（議事録・論文紹介・発表練習で共通） --- */
const collectQuestions = (lines, start, end, { seen = new Set() } = {}) => {
    const qs = [];

    for (let i = start; i <= end; i++) {
        const t = lines[i].text;
        if (!/^\?\s+/.test(t)) continue;

        const q = t.replace(/^\?\s+/, '').trim();
        const key = q.replace(/\s+/g, ' ');
        if (seen.has(key)) continue;
        seen.add(key);

        qs.push({
            id: lines[i].id,
            text: q,
            author: findAuthorAbove(lines, i)
        });
    }
    return qs;
};
