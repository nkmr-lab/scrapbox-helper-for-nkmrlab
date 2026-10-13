/* LabPay連携の許可ページ。chrome.permissions.request はボタン操作の中でしか呼べないので、拡張のページとして置く */
const PERMISSION = { origins: ['https://pay.nkmr.io/*'] };
const enableBtn = document.getElementById('enable');
const disableBtn = document.getElementById('disable');
const statusEl = document.getElementById('status');

const show = (granted, note = '') => {
    enableBtn.hidden = granted;
    disableBtn.hidden = !granted;
    statusEl.className = granted ? 'ok' : '';
    statusEl.textContent = note || (granted
        ? '✅ 有効になっています。Scrapbox のタブに戻ると、メニューに LabPay の欄が出ます（このタブは閉じて大丈夫です）。'
        : '');
};

enableBtn.onclick = async () => {
    enableBtn.disabled = true;
    try {
        const granted = await chrome.permissions.request(PERMISSION);
        show(granted, granted ? '' : '許可されませんでした。もう一度押すとやり直せます。');
    } catch (e) {
        statusEl.className = 'ng';
        statusEl.textContent = `❌ 許可を求められませんでした（${e.message}）`;
    } finally {
        enableBtn.disabled = false;
    }
};

disableBtn.onclick = async () => {
    await chrome.permissions.remove(PERMISSION);
    show(false, '連携をやめました。');
};

chrome.permissions.contains(PERMISSION).then(granted => show(granted));
