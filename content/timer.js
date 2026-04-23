/* ================= タイマー ================= */
/* 発表・質疑のカウントダウンタイマー。完全ローカル。
   ウィジェット自身が時間設定UIを持ち、前回値（テキスト）を chrome.storage.local に継承保存する。
   フロートメニューからは openTimer() で呼び出すのみ。ページ遷移・リロードを跨いで継続動作する。 */

let _timerInterval = null;
let _audioCtx = null;

/* 現在のタイマー状態を取得（なければnull） */
const _loadTimerState = () => loadFromStorage(chrome.storage.local, TIMER_STATE_KEY, null);

const _saveTimerState = (state) => {
    if (state) chrome.storage.local.set({ [TIMER_STATE_KEY]: state });
    else chrome.storage.local.remove(TIMER_STATE_KEY);
};

/* 前回のタイマー入力値（テキスト形式）を取得。未保存なら設定デフォルトから生成 */
const _loadTimerPrefs = async () => {
    const prefs = await loadFromStorage(chrome.storage.local, TIMER_PREFS_KEY, null);
    if (prefs) return prefs;
    const settings = await loadSettings(currentProjectName);
    return {
        talkText: formatTimerMMSS((settings.timerTalkMinutes || 5) * 60),
        qaText: formatTimerMMSS((settings.timerQAMinutes || 5) * 60),
        customText: '',
    };
};

const _saveTimerPrefs = (prefs) => {
    chrome.storage.local.set({ [TIMER_PREFS_KEY]: prefs });
};

/* Web Audio APIで短いビープ音を鳴らす（設定でOFFの場合スキップ） */
const _playBeep = async (freq = 800, durationMs = 200, gainVal = 0.25) => {
    const settings = await loadSettings(currentProjectName);
    if (!settings.timerBeepEnabled) return;
    try {
        if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.value = gainVal;
        osc.connect(gain).connect(_audioCtx.destination);
        osc.start();
        osc.stop(_audioCtx.currentTime + durationMs / 1000);
    } catch {}
};

/* 秒数をmm:ss形式に整形。負数は'-mm:ss' */
const formatTimerMMSS = (seconds) => {
    const sign = seconds < 0 ? '-' : '';
    const s = Math.abs(Math.floor(seconds));
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${sign}${mm}:${ss}`;
};

/* "5:00" または "5"（分のみ） の文字列を秒数に変換する */
const parseTimerInput = (input) => {
    const s = (input || '').trim();
    if (!s) return 0;
    if (s.includes(':')) {
        const [mm, ss] = s.split(':').map(n => Number(n) || 0);
        return mm * 60 + ss;
    }
    return (Number(s) || 0) * 60;
};

/* タイマーを開始する（既存のタイマーは上書きされる） */
const startTimer = ({ label, seconds, nextPhase = null }) => {
    if (seconds <= 0) return;
    const state = {
        label,
        endTime: Date.now() + seconds * 1000,
        paused: false,
        pauseRemainingMs: null,
        nextPhase,
        warn60Played: false,
        warn10Played: false,
    };
    _saveTimerState(state);
    _mountTimerWidget();
    _startTicking();
};

const pauseTimer = async () => {
    const state = await _loadTimerState();
    if (!state || state.paused) return;
    state.pauseRemainingMs = state.endTime - Date.now();
    state.paused = true;
    _saveTimerState(state);
    _renderTimerWidget();
};

const resumeTimer = async () => {
    const state = await _loadTimerState();
    if (!state || !state.paused) return;
    state.endTime = Date.now() + state.pauseRemainingMs;
    state.paused = false;
    state.pauseRemainingMs = null;
    _saveTimerState(state);
    _startTicking();
};

/* タイマーを停止してidle状態に戻す（ウィジェットは残る、入力を再調整可能） */
const stopTimer = () => {
    _saveTimerState(null);
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    _renderTimerWidget();
};

/* ウィジェット全体を閉じる（タイマー動作中なら停止も同時に行う） */
const closeTimerWidget = () => {
    _saveTimerState(null);
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    document.getElementById(TIMER_WIDGET_ID)?.remove();
};

/* ウィジェットのコンテナを配置（既存なら何もしない） */
const _mountTimerWidget = () => {
    if (document.getElementById(TIMER_WIDGET_ID)) return;
    const widget = document.createElement('div');
    widget.id = TIMER_WIDGET_ID;
    widget.className = 'sb-timer-widget';
    document.body.appendChild(widget);
};

/* タイマー状態に応じてidle/runningビューを切り替えて再描画する */
const _renderTimerWidget = async () => {
    const widget = document.getElementById(TIMER_WIDGET_ID);
    if (!widget) return;
    const state = await _loadTimerState();
    if (state) _renderRunningView(widget, state);
    else await _renderIdleView(widget);
};

/* 入力フォームを含むidleビューを描画 */
const _renderIdleView = async (widget) => {
    const prefs = await _loadTimerPrefs();

    widget.className = 'sb-timer-widget sb-timer-widget--idle';

    const header = document.createElement('div');
    header.className = 'sb-timer-header';
    const title = document.createElement('span');
    title.textContent = '⏱ タイマー';
    const closeBtn = renderButton('✕', closeTimerWidget);
    closeBtn.classList.add('sb-timer-btn');
    header.append(title, closeBtn);

    const makeDurationRow = (labelText, prefKey, startLabel) => {
        const row = document.createElement('div');
        row.className = 'sb-timer-idle-row';

        const label = document.createElement('span');
        label.className = 'sb-timer-idle-label';
        label.textContent = labelText;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = prefs[prefKey];
        input.className = 'sb-timer-idle-input';
        input.oninput = () => {
            prefs[prefKey] = input.value;
            _saveTimerPrefs(prefs);
        };

        const startBtn = document.createElement('button');
        startBtn.textContent = startLabel;
        startBtn.className = 'sb-timer-idle-btn';
        startBtn.onclick = () => {
            const sec = parseTimerInput(input.value);
            if (sec > 0) startTimer({ label: labelText, seconds: sec });
        };
        input.onkeydown = (e) => { if (e.key === 'Enter') startBtn.click(); };

        row.append(label, input, startBtn);
        return row;
    };

    const talkRow = makeDurationRow('発表', 'talkText', '開始');
    const qaRow = makeDurationRow('質疑', 'qaText', '開始');

    /* 発表+質疑 連続起動（両inputの現在値を読む） */
    const bothBtn = document.createElement('button');
    bothBtn.textContent = '発表 + 質疑 連続開始';
    bothBtn.className = 'sb-timer-idle-btn sb-timer-idle-btn--wide';
    bothBtn.onclick = () => {
        const talkSec = parseTimerInput(talkRow.querySelector('input').value);
        const qaSec = parseTimerInput(qaRow.querySelector('input').value);
        if (talkSec > 0 && qaSec > 0) {
            startTimer({
                label: '発表', seconds: talkSec,
                nextPhase: { label: '質疑', seconds: qaSec },
            });
        }
    };

    const customRow = makeDurationRow('カスタム', 'customText', '開始');
    customRow.querySelector('input').placeholder = 'mm:ss';

    widget.replaceChildren(header, talkRow, qaRow, bothBtn, customRow);
};

/* 実行中ビュー（大きなカウントダウン + 操作ボタン）を描画 */
const _renderRunningView = (widget, state) => {
    const remainingMs = state.paused ? state.pauseRemainingMs : state.endTime - Date.now();
    const seconds = Math.ceil(remainingMs / 1000);

    widget.className = 'sb-timer-widget';
    if (remainingMs <= 0) widget.classList.add('sb-timer-widget--done');
    else if (remainingMs <= 10000) widget.classList.add('sb-timer-widget--danger');
    else if (remainingMs <= 60000) widget.classList.add('sb-timer-widget--warn');
    if (state.paused) widget.classList.add('sb-timer-widget--paused');

    const labelText = state.label + (state.nextPhase ? ` → ${state.nextPhase.label}` : '');

    const labelNode = document.createElement('div');
    labelNode.className = 'sb-timer-label';
    labelNode.textContent = labelText;

    const timeNode = document.createElement('div');
    timeNode.className = 'sb-timer-time';
    timeNode.textContent = formatTimerMMSS(seconds);

    const btns = document.createElement('div');
    btns.className = 'sb-timer-btns';
    const pauseResumeBtn = renderButton(state.paused ? '▶' : '⏸',
        () => state.paused ? resumeTimer() : pauseTimer());
    pauseResumeBtn.classList.add('sb-timer-btn');
    const stopBtn = renderButton('↺', stopTimer);
    stopBtn.classList.add('sb-timer-btn');
    const closeBtn = renderButton('✕', closeTimerWidget);
    closeBtn.classList.add('sb-timer-btn');
    btns.append(pauseResumeBtn, stopBtn, closeBtn);

    widget.replaceChildren(labelNode, timeNode, btns);
};

/* 定期更新ループ。残り時間に応じて警告ビープ・終了処理・連続フェーズ遷移を行う */
const _startTicking = () => {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const tick = async () => {
        const state = await _loadTimerState();
        if (!state) { _renderTimerWidget(); return; }

        _renderRunningView(document.getElementById(TIMER_WIDGET_ID), state);
        if (state.paused) return;

        const remainingMs = state.endTime - Date.now();

        if (!state.warn60Played && remainingMs <= 60000 && remainingMs > 10000) {
            state.warn60Played = true;
            _saveTimerState(state);
            _playBeep(500, 120);
        }
        if (!state.warn10Played && remainingMs <= 10000 && remainingMs > 0) {
            state.warn10Played = true;
            _saveTimerState(state);
            _playBeep(500, 160);
        }

        if (remainingMs > 0) return;

        if (state.nextPhase && !state.phase2Started) {
            state.phase2Started = true;
            _saveTimerState(state);
            _playBeep(800, 250);
            setTimeout(() => _playBeep(800, 250), 300);
            setTimeout(() => startTimer({
                label: state.nextPhase.label,
                seconds: state.nextPhase.seconds,
            }), 600);
            if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
            return;
        }
        if (!state.endBeepPlayed) {
            state.endBeepPlayed = true;
            _saveTimerState(state);
            _playBeep(800, 300);
            setTimeout(() => _playBeep(800, 300), 400);
            setTimeout(() => _playBeep(800, 300), 800);
        }
        if (remainingMs < -60 * 60 * 1000) stopTimer();
    };
    tick();
    _timerInterval = setInterval(tick, 500);
};

/* フロートメニューから呼ばれるエントリポイント。
   既にウィジェットが開いていれば何もせず、開いていなければ idle/running を自動判定して開く */
const openTimer = async () => {
    if (document.getElementById(TIMER_WIDGET_ID)) return;
    _mountTimerWidget();
    const state = await _loadTimerState();
    if (state) _startTicking();
    else _renderTimerWidget();
};

/* 起動時にchrome.storage.localから保存済みタイマー状態を復元する */
const restoreTimer = async () => {
    const state = await _loadTimerState();
    if (!state) return;

    if (state.paused) {
        _mountTimerWidget();
        _renderTimerWidget();
        return;
    }

    /* 1時間以上経過した残骸は破棄 */
    if (state.endTime - Date.now() < -60 * 60 * 1000) {
        _saveTimerState(null);
        return;
    }

    _mountTimerWidget();
    _startTicking();
};
