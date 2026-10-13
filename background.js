/* ================= バックグラウンド（LabPay 中継） ================= */
/* LabPay (pay.nkmr.io) の API は CORS を *.nkmr.io にしか開けていないので、scrapbox.io のページ（content script）からは直接呼べない。
   拡張の service worker は host 権限を持つ先へ CORS なしで fetch でき、
   LabPay のログインクッキー（labpay_sid, SameSite=None）もそのまま付くので、ここで中継する。
   中継するのは下の読み取り専用 API だけ（書き換え系や任意URLは通さない）。

   拡張は一般公開しているので、pay.nkmr.io への権限は optional_host_permissions にしてある。
   中村研のメンバーが Scrapbox 上の「LabPay連携を有効にする」から許可した時だけ動く
   （許可していない人には権限の確認すら出ない）。 */

const LABPAY_ORIGIN = 'https://pay.nkmr.io';
const LABPAY_PERMISSION = { origins: [LABPAY_ORIGIN + '/*'] };

const LABPAY_ALLOWED_PATHS = [
    /^\/api\/me$/,                          // 残高・連続来室
    /^\/api\/presence$/,                    // 今ラボにいる人
    /^\/api\/timers$/,                      // 自分が関わる共有タイマー
    /^\/api\/conf-deadlines\/upcoming$/,    // 近い学会締め切り
];

const _labpayRelay = async (path) => {
    if (!(await chrome.permissions.contains(LABPAY_PERMISSION))) {
        return { ok: false, status: 0, error: 'no_permission' };
    }
    let url;
    try {
        url = new URL(path, LABPAY_ORIGIN);
    } catch {
        return { ok: false, status: 0, error: 'bad path' };
    }
    if (url.origin !== LABPAY_ORIGIN || !LABPAY_ALLOWED_PATHS.some(re => re.test(url.pathname))) {
        return { ok: false, status: 0, error: 'not allowed' };
    }
    try {
        const r = await fetch(url.href, { credentials: 'include', cache: 'no-store' });
        return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) };
    } catch (e) {
        return { ok: false, status: 0, error: String(e) };
    }
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return false;

    if (msg?.type === 'labpay:get') {
        _labpayRelay(msg.path).then(sendResponse);
        return true;  /* 非同期で sendResponse する */
    }
    if (msg?.type === 'labpay:enable') {
        /* 権限の許可は拡張のページでのボタン操作からしか求められないので、許可ページを開く */
        chrome.tabs.create({ url: chrome.runtime.getURL('labpay_enable.html') });
        sendResponse({ ok: true });
        return false;
    }
    return false;
});

/* 許可・取り消しを、開いている Scrapbox のタブへ知らせる（LabPay 欄をその場で描き直す）。
   tabs 権限は持たないので URL で絞れない → 全タブに送り、content script の居ないタブの失敗は無視 */
const _broadcastLabPayChanged = async () => {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type: 'labpay:changed' }).catch(() => {}));
};
chrome.permissions.onAdded.addListener(_broadcastLabPayChanged);
chrome.permissions.onRemoved.addListener(_broadcastLabPayChanged);
