/* ================= タイマー ================= */
/* 発表用3ベルカウントアップタイマー。完全ローカル。
   1ベル/2ベル/3ベルの各鳴動時刻を設定し、どのベルを「発表終了」とみなすかを選ぶ。
   ウィジェット自身が設定UIを持ち、前回値を chrome.storage.local に継承保存する。
   フロートメニューからは openTimer() で呼び出す。ページ遷移・リロードを跨いで継続。 */

let _timerInterval = null;
let _audioCtx = null;

/* 現在のタイマー状態を取得（なければnull） */
const _loadTimerState = () => loadFromStorage(chrome.storage.local, TIMER_STATE_KEY, null);

const _saveTimerState = (state) => {
    if (state) chrome.storage.local.set({ [TIMER_STATE_KEY]: state });
    else chrome.storage.local.remove(TIMER_STATE_KEY);
};

/* 前回のベル設定を取得。未保存なら設定デフォルトから生成 */
const _loadTimerPrefs = async () => {
    const prefs = await loadFromStorage(chrome.storage.local, TIMER_PREFS_KEY, null);
    if (prefs && prefs.bell1Text) return prefs;
    const settings = await loadSettings(currentProjectName);
    return {
        bell1Text: settings.timerBell1Text || '4:30',
        bell2Text: settings.timerBell2Text || '5:00',
        bell3Text: settings.timerBell3Text || '10:00',
        endBell: settings.timerEndBell || 2,
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

/* n回連続でビープを鳴らす（ベルn番相当、300ms間隔） */
const _playBellSequence = (count, freq = 700) => {
    for (let i = 0; i < count; i++) {
        setTimeout(() => _playBeep(freq, 220), i * 320);
    }
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

/* 3ベル設定でタイマーを開始する */
const startTimer = ({ bells, endBell }) => {
    if (!bells || bells.some(b => b <= 0)) return;
    const state = {
        startAnchor: Date.now(),
        paused: false,
        pauseElapsedMs: null,
        bells,
        endBell,
        bellsRung: [false, false, false],
    };
    _saveTimerState(state);
    _mountTimerWidget();
    _startTicking();
};

const pauseTimer = async () => {
    const state = await _loadTimerState();
    if (!state || state.paused) return;
    state.pauseElapsedMs = Date.now() - state.startAnchor;
    state.paused = true;
    _saveTimerState(state);
    _renderTimerWidget();
};

const resumeTimer = async () => {
    const state = await _loadTimerState();
    if (!state || !state.paused) return;
    state.startAnchor = Date.now() - state.pauseElapsedMs;
    state.paused = false;
    state.pauseElapsedMs = null;
    _saveTimerState(state);
    _startTicking();
};

/* タイマーを停止してidle状態に戻す（入力値は継承） */
const stopTimer = () => {
    _saveTimerState(null);
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    _renderTimerWidget();
};

/* ウィジェット自体を閉じる（タイマー動作中なら停止も行う） */
const closeTimerWidget = () => {
    _saveTimerState(null);
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    document.getElementById(TIMER_WIDGET_ID)?.remove();
};

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

/* 設定フォームを含むidleビューを描画 */
const _renderIdleView = async (widget) => {
    const prefs = await _loadTimerPrefs();

    widget.className = 'sb-timer-widget sb-timer-widget--idle';

    const header = document.createElement('div');
    header.className = 'sb-timer-header';
    const title = document.createElement('span');
    title.textContent = 'タイマー';
    const closeBtn = renderButton('✕', closeTimerWidget);
    closeBtn.classList.add('sb-timer-btn');
    header.append(title, closeBtn);

    const makeBellRow = (label, prefKey) => {
        const row = document.createElement('div');
        row.className = 'sb-timer-idle-row';

        const lbl = document.createElement('span');
        lbl.className = 'sb-timer-idle-label';
        lbl.textContent = label;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = prefs[prefKey];
        input.className = 'sb-timer-idle-input';
        input.placeholder = 'mm:ss';
        input.oninput = () => {
            prefs[prefKey] = input.value;
            _saveTimerPrefs(prefs);
        };

        row.append(lbl, input);
        return row;
    };

    const b1Row = makeBellRow('1ベル', 'bell1Text');
    const b2Row = makeBellRow('2ベル', 'bell2Text');
    const b3Row = makeBellRow('3ベル', 'bell3Text');

    /* 発表終了ベル選択 */
    const endRow = document.createElement('div');
    endRow.className = 'sb-timer-idle-row';
    const endLbl = document.createElement('span');
    endLbl.className = 'sb-timer-idle-label';
    endLbl.textContent = '発表終了';
    const endSel = document.createElement('select');
    endSel.className = 'sb-timer-idle-input';
    [1, 2, 3].forEach(n => {
        const opt = document.createElement('option');
        opt.value = String(n);
        opt.textContent = `${n}ベル`;
        if (prefs.endBell === n) opt.selected = true;
        endSel.appendChild(opt);
    });
    endSel.onchange = () => {
        prefs.endBell = Number(endSel.value);
        _saveTimerPrefs(prefs);
    };
    endRow.append(endLbl, endSel);

    /* 開始ボタン */
    const startBtn = document.createElement('button');
    startBtn.textContent = '開始';
    startBtn.className = 'sb-timer-idle-btn sb-timer-idle-btn--wide';
    startBtn.onclick = () => {
        const bells = [
            parseTimerInput(b1Row.querySelector('input').value),
            parseTimerInput(b2Row.querySelector('input').value),
            parseTimerInput(b3Row.querySelector('input').value),
        ];
        if (bells.some(b => b <= 0)) return;
        startTimer({ bells, endBell: prefs.endBell });
    };

    widget.replaceChildren(header, b1Row, b2Row, b3Row, endRow, startBtn);
};

/* 実行中ビュー（経過時間 + 色変化 + 操作ボタン）を描画 */
const _renderRunningView = (widget, state) => {
    if (!widget) return;

    const elapsedMs = state.paused ? state.pauseElapsedMs : (Date.now() - state.startAnchor);
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const bells = state.bells;
    const endBellSec = bells[state.endBell - 1];

    /* 色状態 */
    widget.className = 'sb-timer-widget';
    if (elapsedMs >= bells[2] * 1000) widget.classList.add('sb-timer-widget--done');
    else if (elapsedMs >= endBellSec * 1000) widget.classList.add('sb-timer-widget--danger');
    else if (elapsedMs >= bells[0] * 1000) widget.classList.add('sb-timer-widget--warn');
    if (state.paused) widget.classList.add('sb-timer-widget--paused');

    const timeNode = document.createElement('div');
    timeNode.className = 'sb-timer-time';
    timeNode.textContent = formatTimerMMSS(elapsedSec);

    const subNode = document.createElement('div');
    subNode.className = 'sb-timer-label';
    subNode.textContent = `発表終了 ${formatTimerMMSS(endBellSec)}（${state.endBell}ベル）`;

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

    widget.replaceChildren(timeNode, subNode, btns);
};

/* 定期更新ループ。各ベル到達時に鳴動、3ベル超過後1時間で自動クリーンアップ */
const _startTicking = () => {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const tick = async () => {
        const state = await _loadTimerState();
        if (!state) { _renderTimerWidget(); return; }
        _renderRunningView(document.getElementById(TIMER_WIDGET_ID), state);
        if (state.paused) return;

        const elapsedMs = Date.now() - state.startAnchor;

        /* ベル発動: i番目のベル時刻を超えたら i+1 回鳴らす */
        for (let i = 0; i < 3; i++) {
            if (!state.bellsRung[i] && elapsedMs >= state.bells[i] * 1000) {
                state.bellsRung[i] = true;
                _saveTimerState(state);
                _playBellSequence(i + 1, 600 + i * 120);
            }
        }

        /* 3ベル超過後1時間で自動終了 */
        if (elapsedMs > state.bells[2] * 1000 + 60 * 60 * 1000) stopTimer();
    };
    tick();
    _timerInterval = setInterval(tick, 500);
};

/* フロートメニューから呼ばれるエントリポイント */
const openTimer = async () => {
    if (document.getElementById(TIMER_WIDGET_ID)) return;
    _mountTimerWidget();
    const state = await _loadTimerState();
    if (state) _startTicking();
    else _renderTimerWidget();
};

/* 起動時に保存済みタイマー状態を復元する */
const restoreTimer = async () => {
    const state = await _loadTimerState();
    if (!state) return;

    if (state.paused) {
        _mountTimerWidget();
        _renderTimerWidget();
        return;
    }

    /* 3ベルから1時間以上経過した残骸は破棄 */
    const elapsedMs = Date.now() - state.startAnchor;
    if (elapsedMs > state.bells[2] * 1000 + 60 * 60 * 1000) {
        _saveTimerState(null);
        return;
    }

    _mountTimerWidget();
    _startTicking();
};
