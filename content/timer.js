/* ================= タイマー ================= */
/* 発表・質疑のカウントダウンタイマー。完全ローカル。chrome.storage.localで状態保持し、
   ページ遷移・リロードを跨いで継続動作する。フロートメニューから起動。 */

let _timerInterval = null;
let _audioCtx = null;

/* 現在のタイマー状態をchrome.storage.localから取得（なければnull） */
const _loadTimerState = () => loadFromStorage(chrome.storage.local, TIMER_STATE_KEY, null);

/* タイマー状態を保存。nullならキーを削除してタイマーを終了扱いにする */
const _saveTimerState = (state) => {
    if (state) chrome.storage.local.set({ [TIMER_STATE_KEY]: state });
    else chrome.storage.local.remove(TIMER_STATE_KEY);
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

/* 動作中のタイマーを一時停止する */
const pauseTimer = async () => {
    const state = await _loadTimerState();
    if (!state || state.paused) return;
    state.pauseRemainingMs = state.endTime - Date.now();
    state.paused = true;
    _saveTimerState(state);
    _updateTimerWidget(state);
};

/* 一時停止中のタイマーを再開する */
const resumeTimer = async () => {
    const state = await _loadTimerState();
    if (!state || !state.paused) return;
    state.endTime = Date.now() + state.pauseRemainingMs;
    state.paused = false;
    state.pauseRemainingMs = null;
    _saveTimerState(state);
    _startTicking();
};

/* タイマーを停止してウィジェットを閉じる */
const resetTimer = () => {
    _saveTimerState(null);
    _unmountTimerWidget();
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
};

/* タイマーウィジェットのDOMコンテナを画面に配置する（既存なら何もしない） */
const _mountTimerWidget = () => {
    if (document.getElementById(TIMER_WIDGET_ID)) return;
    const widget = document.createElement('div');
    widget.id = TIMER_WIDGET_ID;
    widget.className = 'sb-timer-widget';
    document.body.appendChild(widget);
};

const _unmountTimerWidget = () => {
    document.getElementById(TIMER_WIDGET_ID)?.remove();
};

/* ウィジェットの表示内容をstateに合わせて更新する */
const _updateTimerWidget = (state) => {
    const widget = document.getElementById(TIMER_WIDGET_ID);
    if (!widget || !state) return;

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
    const resetBtn = renderButton('↺', resetTimer);
    resetBtn.classList.add('sb-timer-btn');
    const closeBtn = renderButton('✕', resetTimer);
    closeBtn.classList.add('sb-timer-btn');
    btns.append(pauseResumeBtn, resetBtn, closeBtn);

    widget.replaceChildren(labelNode, timeNode, btns);
};

/* 定期更新ループ。残り時間に応じて警告ビープ・終了処理・連続フェーズ遷移を行う */
const _startTicking = () => {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const tick = async () => {
        const state = await _loadTimerState();
        if (!state) { _unmountTimerWidget(); return; }

        _updateTimerWidget(state);
        if (state.paused) return;

        const remainingMs = state.endTime - Date.now();

        /* 警告ビープ（残り1分、残り10秒、それぞれ1回だけ） */
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

        /* 終了時の処理 */
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
        /* 終了後1時間経過で自動クリーンアップ（放置防止） */
        if (remainingMs < -60 * 60 * 1000) resetTimer();
    };
    tick();
    _timerInterval = setInterval(tick, 500);
};

/* フロートメニュー内にタイマーのプリセット＋カスタム入力セクションを描画する */
const renderTimerSection = async (parentNode) => {
    const settings = await loadSettings(currentProjectName);
    const talkMin = settings.timerTalkMinutes || 5;
    const qaMin = settings.timerQAMinutes || 5;

    appendSectionHeader(parentNode, '⏱ タイマー');

    const presetRow = document.createElement('div');
    presetRow.className = 'sb-timer-preset-row';

    const makePresetBtn = (label, onClick) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.className = 'sb-timer-preset-btn';
        btn.onclick = onClick;
        return btn;
    };

    presetRow.append(
        makePresetBtn(`発表 ${formatTimerMMSS(talkMin * 60)}`,
            () => startTimer({ label: '発表', seconds: talkMin * 60 })),
        makePresetBtn(`質疑 ${formatTimerMMSS(qaMin * 60)}`,
            () => startTimer({ label: '質疑', seconds: qaMin * 60 })),
        makePresetBtn('発表+質疑',
            () => startTimer({
                label: '発表', seconds: talkMin * 60,
                nextPhase: { label: '質疑', seconds: qaMin * 60 },
            })),
    );
    parentNode.appendChild(presetRow);

    const customRow = document.createElement('div');
    customRow.className = 'sb-timer-custom-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'mm:ss';
    input.className = 'sb-timer-custom-input';
    const startBtn = makePresetBtn('開始', () => {
        const sec = parseTimerInput(input.value);
        if (sec > 0) startTimer({ label: 'カスタム', seconds: sec });
    });
    input.onkeydown = (e) => { if (e.key === 'Enter') startBtn.click(); };
    customRow.append(input, startBtn);
    parentNode.appendChild(customRow);
};

/* 起動時にchrome.storage.localから保存済みタイマー状態を復元する */
const restoreTimer = async () => {
    const state = await _loadTimerState();
    if (!state) return;

    if (state.paused) {
        _mountTimerWidget();
        _updateTimerWidget(state);
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
