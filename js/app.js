/*
 * ESC English — 통합 UI/UX 프로토타입
 *
 * 화면 흐름과 인터랙션을 확인하기 위한 정적 프로토타입입니다.
 *  - 로그인(OAuth), 기록 저장, 음성 인식은 흉내만 냅니다. (실제 구현 사양: docs/기능명세서.md)
 *  - 데이터는 js/mock-data.js 의 발췌본을 사용합니다.
 */

const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#view');
const topbar = $('#topbar');

// ───────────────────────── 프로토타입 상태 ─────────────────────────
const store = {
    get(key, fallback) {
        try { return JSON.parse(localStorage.getItem('esc.proto.' + key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem('esc.proto.' + key, JSON.stringify(value)); } catch { /* 사파리 사생활 보호 모드 등 */ }
    }
};

const state = {
    user: store.get('user', null),
    // 아래 기록은 로그인 시 서버에서 받아오는 값이라고 가정한 목업
    orderDone: new Set([0, 2, 3]),
    wordDone: { 0: { score: 5, total: 6 } },
    blank: store.get('blank', {
        cursor: 30,                    // 지금까지 '학습 시작'으로 소화한 문장 수
        review: [                      // 복습함: 틀린 문장 + 복습 정답 횟수
            { id: 'EX-S01E01-02', hits: 0 },
            { id: 'EX-S01E01-06', hits: 2 },
            { id: 'EX-S01E01-07', hits: 1 },
            { id: 'EX-S01E01-09', hits: 0 },
            { id: 'EX-S01E02-02', hits: 2 }
        ],
        abyss: ['EX-S01E01-03', 'EX-S01E01-05', 'EX-S01E01-08'],
        sessions: 3
    })
};

const BLANK_ABYSS_HITS = 3;     // 복습에서 3번 맞추면 심연으로
const BLANK_SESSION_SIZE = 10;  // 한 세션 10문장

function saveBlank() { store.set('blank', state.blank); }

// ───────────────────────── 유틸 ─────────────────────────
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
function normalizeAnswer(s) {
    return String(s || '').normalize('NFC').replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
}
function fmtDuration(ms) {
    const s = Math.max(1, Math.round(ms / 1000));
    return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;
}
function fmtNow() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}. ${p(d.getMonth() + 1)}. ${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}
function burst() {
    const box = $('#burst');
    const emojis = ['✨', '🎉', '👏', '🔥', '💯', '🍀'];
    for (let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.textContent = emojis[i % emojis.length];
        p.style.setProperty('--tx', `${(Math.random() - 0.5) * 300}px`);
        p.style.setProperty('--ty', `${(Math.random() - 0.5) * 300}px`);
        box.appendChild(p);
        setTimeout(() => p.remove(), 900);
    }
}
function modal({ title, body, actions }) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = body;
    const box = $('#modal-actions');
    box.innerHTML = '';
    actions.forEach(a => {
        const b = document.createElement('button');
        b.className = 'btn' + (a.secondary ? ' secondary' : '');
        b.textContent = a.label;
        b.onclick = () => { closeModal(); a.onClick && a.onClick(); };
        box.appendChild(b);
    });
    $('#modal').classList.add('open');
}
function closeModal() { $('#modal').classList.remove('open'); }

const icon = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'
};

// ───────────────────────── 계정 / 로그인 ─────────────────────────
function renderAccountButton() {
    const btn = $('#account-btn');
    if (state.user) {
        btn.innerHTML = `<span class="avatar">${esc(state.user.name[0])}</span>${esc(state.user.name)}`;
        btn.onclick = () => go('me');
    } else {
        btn.textContent = '로그인';
        btn.onclick = openLogin;
    }
}
function openLogin() {
    const inApp = /KAKAOTALK/i.test(navigator.userAgent) || location.search.includes('inapp=1');
    $('#inapp-warning').classList.toggle('hidden', !inApp);
    $('.oauth-btn.google').disabled = inApp;
    $('#login-sheet').classList.add('open');
}
function closeLogin() { $('#login-sheet').classList.remove('open'); }

document.querySelectorAll('.oauth-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const provider = btn.dataset.provider;
        state.user = { name: provider === 'kakao' ? '써니' : 'Sunny', provider };
        if ($('#keep-login').checked) store.set('user', state.user);
        closeLogin();
        toast(`${provider === 'kakao' ? '카카오' : 'Google'}로 로그인했어요 · 이 기기의 기록을 합쳤어요`);
        render();
    });
});
$('#login-cancel').onclick = closeLogin;
$('#login-sheet').addEventListener('click', e => { if (e.target.id === 'login-sheet') closeLogin(); });

function logout() {
    state.user = null;
    store.set('user', null);
    toast('로그아웃했어요. 이 기기에서는 계속 비로그인으로 이용할 수 있어요.');
    go('');
}

// ───────────────────────── 라우터 ─────────────────────────
function go(path) { location.hash = '#/' + path; }
function setTop(title, backTo) {
    topbar.classList.toggle('is-home', title === null);
    $('#topbar-title').textContent = title || '';
    $('#topbar-back').onclick = () => (backTo === undefined ? history.back() : go(backTo));
}

const routes = [
    [/^$/, renderHome],
    [/^order$/, renderOrderList],
    [/^order\/play\/(\d+)$/, m => renderOrderGame(+m[1])],
    [/^order\/done$/, renderOrderDone],
    [/^word$/, renderWordList],
    [/^word\/(\d+)$/, m => renderWordMode(+m[1])],
    [/^word\/(\d+)\/study$/, m => renderWordStudy(+m[1])],
    [/^word\/(\d+)\/test$/, m => renderWordTest(+m[1])],
    [/^word\/result$/, renderWordResult],
    [/^blank$/, renderBlankHome],
    [/^blank\/play\/(new|review)$/, m => renderBlankPlay(m[1])],
    [/^blank\/result$/, renderBlankResult],
    [/^me$/, renderMe]
];

function render() {
    stopVoice();
    renderAccountButton();
    const path = location.hash.replace(/^#\/?/, '');
    const route = routes.find(([re]) => re.test(path));
    window.scrollTo(0, 0);
    if (route) route[1](path.match(route[0])); else go('');
}
window.addEventListener('hashchange', render);

// ───────────────────────── 홈 ─────────────────────────
function renderHome() {
    setTop(null);
    const u = state.user;
    const reviewCount = state.blank.review.length;
    view.innerHTML = `
        <h1 class="hello">${u ? `${esc(u.name)}님,<br>오늘도 한 걸음 🍀` : '이상한 스피킹 클럽<br>오늘의 영어 🍀'}</h1>
        <p class="hello-sub">${u ? '이어서 할 학습을 골라 보세요.' : '로그인 없이 바로 시작할 수 있어요.'}</p>

        ${u ? `
        <div class="section-label">오늘</div>
        <div class="today-strip">
            <div class="today-cell"><div class="num">${state.orderDone.size}</div><div class="lbl">영작 완료</div></div>
            <div class="today-cell"><div class="num">${reviewCount}</div><div class="lbl">복습 대기</div></div>
            <div class="today-cell"><div class="num">4일</div><div class="lbl">연속 학습</div></div>
        </div>` : `
        <div class="guest-banner">
            <span>🗂️</span>
            <span><b>로그인하면</b> 어떤 숙제를 했는지 기록돼요</span>
            <button id="home-login">로그인</button>
        </div>`}

        <div class="section-label">학습</div>
        <div class="module-list">
            <a class="card pressable module-card order" href="#/order">
                <div class="module-icon">🧩</div>
                <div class="module-body">
                    <div class="module-name">영작 · 단어 나열</div>
                    <div class="module-desc">한국어 문장을 보고 단어를 탭하거나 🎤 말해서 영어 문장을 완성해요.</div>
                    <div class="module-meta">
                        <span class="pill">숙제 ${MOCK.orderPackages.length}개</span>
                        ${u ? `<span class="pill done">✓ ${state.orderDone.size}개 완료</span>` : ''}
                        <span class="pill">🎤 음성 입력</span>
                    </div>
                </div>
            </a>
            <a class="card pressable module-card word" href="#/word">
                <div class="module-icon">📚</div>
                <div class="module-body">
                    <div class="module-name">단어 공부</div>
                    <div class="module-desc">카드로 단어와 예문을 익히고, 테스트로 철자까지 확인해요.</div>
                    <div class="module-meta">
                        <span class="pill">세트 ${MOCK.wordQuizzes.length}개</span>
                        ${u ? `<span class="pill done">✓ ${Object.keys(state.wordDone).length}개 통과</span>` : ''}
                    </div>
                </div>
            </a>
            <a class="card pressable module-card blank" href="#/blank">
                <div class="module-icon">✍️</div>
                <div class="module-body">
                    <div class="module-name">빈칸 표현</div>
                    <div class="module-desc">예문 속 핵심 표현을 직접 타이핑해요. 10문장씩, 틀린 건 알아서 복습.</div>
                    <div class="module-meta">
                        <span class="pill new-badge">NEW</span>
                        <span class="pill">${state.blank.cursor} / ${MOCK.blankTotal.toLocaleString()}</span>
                        ${reviewCount ? `<span class="pill to-review">복습 ${reviewCount}</span>` : ''}
                    </div>
                </div>
            </a>
        </div>

        <footer class="site-footer">
            <p>이 페이지의 모든 콘텐츠는 ESC(이상한 스피킹 클럽) 운영자에게 귀속됩니다.</p>
            <a href="mailto:jisun645028@gmail.com">문의: jisun645028@gmail.com</a>
            <p class="proto-note">UI 프로토타입 · 로그인/음성 인식/기록 저장은 시뮬레이션입니다</p>
        </footer>
    `;
    const hl = $('#home-login');
    if (hl) hl.onclick = openLogin;
}

// ───────────────────────── 영작 · 단어 나열 ─────────────────────────
let orderFilter = { type: 'all', q: '', status: 'all' };

function renderOrderList() {
    setTop('영작 · 단어 나열', '');
    const types = ['all', ...new Set(MOCK.orderPackages.map(p => p.type))];
    view.innerHTML = `
        <div class="list-tools">
            <label class="search-box">${icon.search}<input id="order-q" type="search" placeholder="제목 · 문장 검색" value="${esc(orderFilter.q)}"></label>
        </div>
        <div class="chips">${types.map(t => `<button class="chip ${orderFilter.type === t ? 'active' : ''}" data-type="${esc(t)}">${t === 'all' ? '전체' : esc(t)}</button>`).join('')}</div>
        ${state.user ? `<div class="status-tabs">
            ${[['all', '전체'], ['todo', '안 한 숙제'], ['done', '완료']].map(([k, l]) => `<button data-status="${k}" class="${orderFilter.status === k ? 'active' : ''}">${l}</button>`).join('')}
        </div>` : ''}
        <div class="hw-list" id="order-list"></div>
    `;
    const draw = () => {
        const q = normalizeAnswer(orderFilter.q);
        const items = MOCK.orderPackages
            .map((p, i) => ({ p, i, done: state.orderDone.has(i) }))
            .filter(({ p }) => orderFilter.type === 'all' || p.type === orderFilter.type)
            .filter(({ p }) => !q || normalizeAnswer(p.title + ' ' + p.questions.map(x => x.ko + ' ' + x.en).join(' ')).includes(q))
            .filter(({ done }) => !state.user || orderFilter.status === 'all' || (orderFilter.status === 'done') === done);
        $('#order-list').innerHTML = items.length ? items.map(({ p, i, done }) => `
            <a class="card pressable hw-item ${done ? 'is-done' : ''}" href="#/order/play/${i}">
                <div class="hw-main">
                    <div class="hw-title">${esc(p.title)}</div>
                    <div class="hw-sub"><span>${esc(p.date)}</span><span class="pill">${esc(p.type)}</span></div>
                </div>
                ${state.user ? (done ? '<span class="pill done">✓ 완료</span>' : '<span class="pill todo">미완료</span>') : ''}
            </a>`).join('') : '<div class="empty">조건에 맞는 숙제가 없어요.</div>';
    };
    draw();
    $('#order-q').addEventListener('input', e => { orderFilter.q = e.target.value; draw(); });
    view.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { orderFilter.type = b.dataset.type; renderOrderList(); });
    view.querySelectorAll('[data-status]').forEach(b => b.onclick = () => { orderFilter.status = b.dataset.status; renderOrderList(); });
}

let og = null; // order game state

function renderOrderGame(pkgIdx) {
    const pkg = MOCK.orderPackages[pkgIdx];
    if (!pkg) return go('order');
    if (!og || og.pkgIdx !== pkgIdx) {
        og = { pkgIdx, qIdx: 0, startedAt: Date.now(), tap: 0, voice: 0, wrong: 0 };
    }
    setTop(pkg.title, 'order');
    loadOrderQuestion();
}

function loadOrderQuestion() {
    const pkg = MOCK.orderPackages[og.pkgIdx];
    const q = pkg.questions[og.qIdx];
    og.answer = q.en.split(' ');
    og.pool = shuffle([...og.answer, ...q.distractors]).map((text, id) => ({ id, text }));
    og.selected = [];
    const total = pkg.questions.length;
    view.innerHTML = `
        <div class="game-head">
            <div class="progress-bar"><span style="width:${(og.qIdx / total) * 100}%"></span></div>
            <div class="counter">${og.qIdx + 1} / ${total}</div>
        </div>
        <div class="prompt-ko">${esc(q.ko)}</div>
        <div class="answer-zone" id="answer-zone"></div>
        <div class="word-pool" id="word-pool"></div>
        <div class="voice-panel hidden" id="voice-panel">
            <span class="dot"></span>
            <span class="heard" id="heard"><em>듣고 있어요… 문장을 소리 내어 말해 보세요</em></span>
        </div>
        <div class="game-bottom">
            <button class="mic-btn" id="mic-btn" aria-label="음성으로 입력">${icon.mic}</button>
            <button class="btn" id="check-btn" disabled>확인</button>
        </div>
    `;
    $('#mic-btn').onclick = toggleVoice;
    $('#check-btn').onclick = checkOrder;
    drawOrderWords();
}

function drawOrderWords(flashId) {
    const zone = $('#answer-zone'), pool = $('#word-pool');
    zone.innerHTML = '';
    pool.innerHTML = '';
    og.selected.forEach((w, i) => {
        const b = document.createElement('button');
        b.className = 'word-btn' + (w.src === 'voice' ? ' voice' : '') + (w.id === flashId ? ' flash' : '');
        b.textContent = w.text;
        b.onclick = () => { og.pool.push(og.selected.splice(i, 1)[0]); drawOrderWords(); };
        zone.appendChild(b);
    });
    og.pool.forEach((w, i) => {
        const b = document.createElement('button');
        b.className = 'word-btn';
        b.textContent = w.text;
        b.onclick = () => placeWord(i, 'tap');
        pool.appendChild(b);
    });
    $('#check-btn').disabled = og.selected.length === 0;
}

function placeWord(poolIdx, src) {
    const w = og.pool.splice(poolIdx, 1)[0];
    og.selected.push({ ...w, src });
    drawOrderWords(src === 'voice' ? w.id : undefined);
}

// 음성 인식 시뮬레이션: 실제 구현은 Web Speech API (명세서 3장)
let voiceTimer = null;
function toggleVoice() { voiceTimer ? stopVoice() : startVoice(); }
function startVoice() {
    $('#mic-btn').classList.add('on');
    $('#voice-panel').classList.remove('hidden');
    // 시뮬레이션: 정답 문장을 앞에서부터 한 단어씩 "말한" 것으로 보고,
    // 아직 남아 있는 단어 버튼과 일치하면 탭한 것처럼 옮긴다. (일치하지 않으면 취소선으로 표시)
    const bare = t => t.toLowerCase().replace(/[^a-z0-9']/g, '');
    const heard = [];
    let cursor = 0;
    voiceTimer = setInterval(() => {
        if (cursor >= og.answer.length) { stopVoice(); return; }
        const spoken = bare(og.answer[cursor++]);
        const idx = og.pool.findIndex(w => bare(w.text) === spoken);
        heard.push(`<span class="${idx === -1 ? 'miss' : 'hit'}">${esc(spoken)}</span>`);
        $('#heard').innerHTML = heard.slice(-6).join(' ');
        if (idx !== -1) placeWord(idx, 'voice');
    }, 750);
}
function stopVoice() {
    clearInterval(voiceTimer);
    voiceTimer = null;
    const m = $('#mic-btn'), p = $('#voice-panel');
    if (m) m.classList.remove('on');
    if (p) p.classList.add('hidden');
}

function checkOrder() {
    stopVoice();
    const ok = og.selected.map(w => w.text).join(' ') === og.answer.join(' ');
    if (!ok) {
        og.wrong++;
        modal({
            title: '오답이에요 😢',
            body: `올바른 문장<div class="answer">${esc(og.answer.join(' '))}</div>`,
            actions: [{ label: '다시 하기', onClick: loadOrderQuestion }]
        });
        return;
    }
    og.selected.forEach(w => (w.src === 'voice' ? og.voice++ : og.tap++));
    burst();
    const pkg = MOCK.orderPackages[og.pkgIdx];
    og.qIdx++;
    setTimeout(() => (og.qIdx < pkg.questions.length ? loadOrderQuestion() : go('order/done')), 550);
}

function renderOrderDone() {
    if (!og) return go('order');
    const pkg = MOCK.orderPackages[og.pkgIdx];
    if (state.user) state.orderDone.add(og.pkgIdx);
    const total = og.tap + og.voice || 1;
    const tapPct = Math.round((og.tap / total) * 100), voicePct = 100 - tapPct;
    setTop('완료', 'order');
    view.innerHTML = `
        <div class="result">
            <div class="result-icon">🏆</div>
            <div class="result-title">Mission Complete!</div>
            <div class="result-sub">${esc(pkg.title)}</div>

            <div class="card">
                <div class="stat-row"><span>걸린 시간</span><b>${fmtDuration(Date.now() - og.startedAt)}</b></div>
                <div class="stat-row"><span>오답 후 재도전</span><b>${og.wrong}회</b></div>
                <div class="stat-row"><span>인증 일시</span><b>${fmtNow()}</b></div>
            </div>

            <div class="card">
                <div class="stat-row"><span>입력 방식</span><b>🎤 스피킹 ${voicePct}%</b></div>
                <div class="ratio-bar"><span class="tap" style="width:${tapPct}%"></span><span class="voice" style="width:${voicePct}%"></span></div>
                <div class="ratio-legend">
                    <span><i style="background:var(--ink)"></i>탭 ${tapPct}% (${og.tap}단어)</span>
                    <span><i style="background:var(--mic)"></i>스피킹 ${voicePct}% (${og.voice}단어)</span>
                </div>
            </div>

            <div class="capture-note">이 화면을 캡처해서 톡방에 보내어 인증해주세요 📸
                ${state.user ? '<br>✓ 내 기록에도 저장되었어요.' : '<br>로그인하면 완료 기록이 자동으로 남아요.'}</div>
            <a class="btn" href="#/order">목록으로</a>
        </div>
    `;
    og = null;
}

// ───────────────────────── 단어 공부 ─────────────────────────
function renderWordList() {
    setTop('단어 공부', '');
    view.innerHTML = `
        <div class="list-tools"><label class="search-box">${icon.search}<input type="search" placeholder="퀴즈 제목 검색"></label></div>
        <div class="hw-list">
            ${MOCK.wordQuizzes.map((qz, i) => {
                const r = state.wordDone[i];
                return `<a class="card pressable hw-item ${r ? 'is-done' : ''}" href="#/word/${i}">
                    <div class="hw-main">
                        <div class="hw-title">${esc(qz.title)}</div>
                        <div class="hw-sub"><span>📅 ${esc(qz.date)}</span><span>${qz.questions.length}단어</span></div>
                    </div>
                    ${state.user ? (r ? `<span class="pill done">✓ ${r.score}/${r.total}</span>` : '<span class="pill todo">미응시</span>') : ''}
                </a>`;
            }).join('')}
        </div>
    `;
}

function renderWordMode(i) {
    const qz = MOCK.wordQuizzes[i];
    if (!qz) return go('word');
    setTop(qz.title, 'word');
    const r = state.wordDone[i];
    view.innerHTML = `
        <div class="card" style="text-align:center;padding:26px 18px">
            <div style="font-size:13px;color:var(--text-2);font-weight:700">무엇을 할까요?</div>
            <div style="font-size:22px;font-weight:800;margin-top:8px">${esc(qz.title)}</div>
            <div style="font-size:14px;color:var(--text-2);margin-top:6px">${qz.questions.length}단어 · ${esc(qz.date)}${r ? ` · 최근 ${r.score}/${r.total}` : ''}</div>
        </div>
        <div class="mode-grid">
            <a class="card pressable mode-card" href="#/word/${i}/study" style="text-decoration:none">
                <div class="module-icon">📖</div>
                <div class="module-body"><div class="module-name">학습 모드</div><div class="module-desc">카드를 넘기며 뜻 · 예문 · 발음 확인</div></div>
            </a>
            <a class="card pressable mode-card" href="#/word/${i}/test" style="text-decoration:none">
                <div class="module-icon">📝</div>
                <div class="module-body"><div class="module-name">테스트 모드</div><div class="module-desc">뜻과 예문을 보고 단어 철자 입력 · 60% 이상 통과</div></div>
            </a>
        </div>
    `;
}

let ws = null; // word study/test state

function renderWordStudy(i) {
    const qz = MOCK.wordQuizzes[i];
    if (!qz) return go('word');
    if (!ws || ws.i !== i || ws.mode !== 'study') ws = { i, mode: 'study', idx: 0 };
    const q = qz.questions[ws.idx];
    const ans = q.answers[q.answers.length - 1];
    setTop(qz.title, `word/${i}`);
    view.innerHTML = `
        <div class="game-head">
            <div class="progress-bar" style="color:var(--word)"><span style="width:${((ws.idx + 1) / qz.questions.length) * 100}%"></span></div>
            <div class="counter">${ws.idx + 1} / ${qz.questions.length}</div>
        </div>
        <div class="card study-card">
            <div class="study-meaning">💡 ${esc(q.meaning)}</div>
            <div class="study-word">${esc(q.answers[0])}</div>
            <div class="speak-row">
                <button class="speak-btn" data-say="${esc(q.answers[0])}">🔊 단어</button>
                <button class="speak-btn" data-say="${esc(q.sentence.replace(/___/g, ans))}">🔊 예문</button>
            </div>
            <div class="study-sentence">${esc(q.sentence).replace(/___/g, `<u>${esc(ans)}</u>`)}</div>
        </div>
        <div class="game-bottom">
            <button class="btn secondary" id="prev" ${ws.idx === 0 ? 'disabled' : ''}>이전</button>
            <button class="btn" id="next">${ws.idx === qz.questions.length - 1 ? '학습 완료 → 테스트' : '다음'}</button>
        </div>
    `;
    view.querySelectorAll('[data-say]').forEach(b => b.onclick = () => {
        if (!window.speechSynthesis) return toast('이 브라우저는 발음 듣기를 지원하지 않아요');
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(b.dataset.say);
        u.lang = 'en-US'; u.rate = 0.9;
        speechSynthesis.speak(u);
    });
    $('#prev').onclick = () => { ws.idx--; renderWordStudy(i); };
    $('#next').onclick = () => {
        if (ws.idx < qz.questions.length - 1) { ws.idx++; renderWordStudy(i); }
        else { ws = null; go(`word/${i}/test`); }
    };
}

function renderWordTest(i) {
    const qz = MOCK.wordQuizzes[i];
    if (!qz) return go('word');
    if (!ws || ws.i !== i || ws.mode !== 'test') ws = { i, mode: 'test', idx: 0, correct: 0, busy: false, results: [] };
    if (ws.idx >= qz.questions.length) return go('word/result');
    const q = qz.questions[ws.idx];
    setTop(qz.title, `word/${i}`);
    view.innerHTML = `
        <div class="game-head">
            <div class="progress-bar" style="color:var(--word)"><span style="width:${(ws.idx / qz.questions.length) * 100}%"></span></div>
            <div class="counter">${ws.idx + 1} / ${qz.questions.length}</div>
        </div>
        <div class="card quiz-card" id="quiz-card">
            <div class="quiz-meaning">💡 ${esc(q.meaning)}</div>
            <div class="quiz-sentence">${esc(q.sentence)}</div>
            <input class="big-input" id="word-input" inputmode="none" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="정답을 입력하면 바로 넘어가요">
        </div>
        <div class="blank-dock">
            <div class="blank-actions solo"><button class="btn secondary" id="pass">🤷 모르겠음 (Pass)</button></div>
            ${vkbHtml()}
        </div>
    `;
    const input = $('#word-input');
    setTimeout(() => input.focus(), 30);
    const answers = q.answers.map(normalizeAnswer);
    const feedback = ok => {
        if (ws.busy) return;
        ws.busy = true;
        input.disabled = true;
        if (ok) ws.correct++;
        ws.results.push(ok);
        if (!ok) { input.value = q.answers[q.answers.length - 1]; input.style.color = 'var(--bad)'; }
        $('#quiz-card').insertAdjacentHTML('beforeend', `<div class="feedback-pop">${ok ? '✅' : '❌'}</div>`);
        setTimeout(() => { ws.idx++; ws.busy = false; renderWordTest(i); }, ok ? 500 : 1600);
    };
    input.addEventListener('input', () => answers.includes(normalizeAnswer(input.value)) && feedback(true));
    $('#pass').onclick = () => feedback(false);

    // 가상 키보드 (빈칸 학습과 같은 키보드). 정답이 아니면 ↵는 아무 일도 하지 않고 안내만 한다
    const maxLen = Math.max(...q.answers.map(a => a.length));
    bindVkb(view.querySelector('.vkb'), {
        press(key) {
            if (ws.busy) return;
            if (key === 'enter') { toast('철자를 다시 확인해 보세요'); return; }
            if (key === 'back') input.value = input.value.slice(0, -1);
            else {
                if (input.value.length >= maxLen) return;
                input.value += key;
            }
            input.dispatchEvent(new Event('input'));
        }
    });
}

function renderWordResult() {
    if (!ws || ws.mode !== 'test') return go('word');
    const qz = MOCK.wordQuizzes[ws.i];
    const total = qz.questions.length;
    const passed = ws.correct / total >= 0.6;
    if (state.user) state.wordDone[ws.i] = { score: ws.correct, total };
    setTop('결과', 'word');
    view.innerHTML = `
        <div class="result">
            <div class="result-icon">${passed ? '🏆' : '😢'}</div>
            <div class="result-title" style="color:${passed ? 'var(--good)' : 'var(--bad)'}">${passed ? '미션 컴플리트!' : '미션 실패…'}</div>
            <div class="result-sub">${esc(qz.title)}</div>
            <div class="card">
                <div class="stat-row"><span>정답</span><b>${ws.correct} / ${total}</b></div>
                <div class="dots" style="justify-content:flex-start;margin:6px 0">${ws.results.map(ok => `<i class="${ok ? 'ok' : 'ng'}"></i>`).join('')}</div>
                <div class="stat-row"><span>완성 시각</span><b>${fmtNow()}</b></div>
            </div>
            <div class="capture-note">${state.user ? '✓ 내 기록에 저장되었어요.' : '로그인하면 점수 기록이 남아요.'}</div>
            <div class="btn-row">
                <a class="btn secondary" href="#/word/${ws.i}/test" onclick="ws=null">다시 테스트</a>
                <a class="btn" href="#/word">목록으로</a>
            </div>
        </div>
    `;
}

// ───────────────────────── 빈칸 표현 ─────────────────────────
const blankById = id => MOCK.blankItems.find(b => b.id === id);

// cloze 문자열 "We {put} the bookshelf {together}." → 조각 배열
// 여러 단어 표현(cut off 등)은 단어마다 입력칸을 따로 만든다. 단어 사이 공백은 글자로 보여 준다.
function parseCloze(cloze) {
    const parts = [];
    cloze.split(/(\{[^}]+\})/).forEach(seg => {
        if (!seg) return;
        if (seg.startsWith('{')) {
            seg.slice(1, -1).split(' ').forEach((word, i) => {
                if (i > 0) parts.push({ text: ' ' });
                parts.push({ answer: word });
            });
        } else parts.push({ text: seg });
    });
    return parts;
}

function renderBlankHome() {
    setTop('빈칸 표현', '');
    const b = state.blank;
    const total = MOCK.blankTotal;
    const pct = (b.cursor / total) * 100;
    const start = b.cursor + 1, end = Math.min(total, b.cursor + BLANK_SESSION_SIZE);
    view.innerHTML = `
        ${state.user ? '' : `<div class="guest-banner" style="margin:0 0 12px"><span>💾</span><span>지금은 <b>이 기기에만</b> 진도가 저장돼요</span><button id="bl-login">로그인</button></div>`}
        <div class="card blank-hero">
            <div class="hero-top">
                <div class="hero-num">${b.cursor.toLocaleString()} <small>/ ${total.toLocaleString()} 문장</small></div>
                <div class="hero-caption">${pct.toFixed(1)}%</div>
            </div>
            <div class="progress-bar"><span style="width:${Math.max(pct, 1)}%"></span></div>
            <div class="next-chunk">다음 학습: <b>${start}~${end}번째 문장</b></div>
        </div>

        <div class="action-grid">
            <button class="action-card primary" id="bl-new">
                <div>
                    <div class="ac-title">학습 시작</div>
                    <div class="ac-sub">새 문장 ${BLANK_SESSION_SIZE}개 이어서 풀기</div>
                </div>
                <span class="ac-arrow">→</span>
            </button>
            <button class="action-card review" id="bl-review" ${b.review.length ? '' : 'disabled'}>
                <div class="ac-title">복습</div>
                <div class="ac-count">${b.review.length}</div>
                <div class="ac-sub">틀렸던 문장 반복</div>
            </button>
            <div class="action-card abyss">
                <div class="ac-title">🕳️ 심연</div>
                <div class="ac-count">${b.abyss.length}</div>
                <div class="ac-sub">완전히 익힌 문장 · 가끔 복습에 섞여 나와요</div>
            </div>
        </div>

        <div class="section-label">복습 규칙</div>
        <div class="card">
            <div class="ladder">
                <span class="step">새 문장</span>→ 틀리면 →
                <span class="step r">복습함</span>→ 복습에서 ${BLANK_ABYSS_HITS}번 맞추면 →
                <span class="step a">심연</span>
            </div>
            <div class="hint-line" style="margin-top:10px">심연의 문장은 가끔 복습 세션에 1~2개씩 섞여 나오고, 틀리면 다시 복습함으로 돌아와요.</div>
        </div>

        ${b.review.length ? `
        <div class="section-label">복습함 미리보기</div>
        <div class="result-list" style="margin-top:0">
            ${b.review.map(r => {
                const it = blankById(r.id);
                return it ? `<div class="result-item"><span class="mark">🔁</span><span><span class="expr">${esc(it.expr)}</span><br><span style="color:var(--text-2)">${esc(it.meaning)}</span></span>
                    <span class="move dots" style="margin:0 0 0 auto">${Array.from({ length: BLANK_ABYSS_HITS }, (_, k) => `<i class="${k < r.hits ? 'ok' : ''}"></i>`).join('')}</span></div>` : '';
            }).join('')}
        </div>` : ''}
    `;
    $('#bl-new').onclick = () => go('blank/play/new');
    $('#bl-review').onclick = () => go('blank/play/review');
    const bl = $('#bl-login');
    if (bl) bl.onclick = openLogin;
}

let bs = null; // blank session

function buildBlankSession(mode) {
    const b = state.blank;
    const items = MOCK.blankItems;
    if (mode === 'new') {
        return Array.from({ length: BLANK_SESSION_SIZE }, (_, k) => ({ id: items[(b.cursor + k) % items.length].id, kind: 'new' }));
    }
    // 복습: 복습함 중 정답 횟수가 적은 순으로 최대 10개 + 심연에서 가끔 1~2개
    const review = [...b.review].sort((x, y) => x.hits - y.hits).map(r => ({ id: r.id, kind: 'review' }));
    // 명세서 5.5: 복습 2회에 1번 꼴로 심연에서 1~2개 (프로토타입은 7일 경과 조건 생략)
    const abyssPick = b.sessions % 2 === 0 ? shuffle(b.abyss).slice(0, 2).map(id => ({ id, kind: 'abyss' })) : [];
    return shuffle([...review.slice(0, BLANK_SESSION_SIZE - abyssPick.length), ...abyssPick]);
}

function renderBlankPlay(mode) {
    if (!bs || bs.mode !== mode) {
        const queue = buildBlankSession(mode);
        if (!queue.length) return go('blank');
        bs = { mode, queue, idx: 0, results: [] };
    }
    if (bs.idx >= bs.queue.length) return go('blank/result');
    const entry = bs.queue[bs.idx];
    const it = blankById(entry.id);
    const parts = parseCloze(it.cloze);
    setTop(mode === 'new' ? '빈칸 · 학습' : '빈칸 · 복습', 'blank');

    let n = 0;
    const clozeHtml = parts.map(p => p.text !== undefined ? esc(p.text)
        : `<input class="cloze-input" data-k="${n++}" style="width:${Math.max(3, p.answer.length + 1)}ch" inputmode="none" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="빈칸">`).join('');
    const answers = parts.filter(p => p.answer).map(p => p.answer);
    const tags = [
        entry.kind === 'review' ? '<span class="pill mode-review">🔁 복습</span>' : '',
        entry.kind === 'abyss' ? '<span class="pill mode-abyss">🕳️ 심연에서 올라옴</span>' : ''
    ].join('');

    view.innerHTML = `
        <div class="game-head">
            <div class="progress-bar" style="color:var(--blank)"><span style="width:${(bs.idx / bs.queue.length) * 100}%"></span></div>
            <div class="counter">${bs.idx + 1} / ${bs.queue.length}</div>
        </div>
        <div class="dots">${bs.queue.map((_, k) => `<i class="${k < bs.idx ? (bs.results[k].ok ? 'ok' : 'ng') : ''} ${k === bs.idx ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="card">
            ${tags ? `<div class="blank-meta">${tags}</div>` : ''}
            <div class="blank-meaning">뜻 · <b>${esc(it.meaning)}</b></div>
            <div class="cloze" id="cloze">${clozeHtml}</div>
            <div id="blank-feedback"></div>
            <div class="hint-line" id="hint-line">빈칸 ${answers.length}개 · ↵ 키로 제출 · 대소문자는 구분하지 않아요</div>
        </div>
        <div class="blank-dock">
            <div class="blank-actions">
                <button class="btn secondary" id="bl-hint">💡 힌트</button>
                <button class="btn secondary" id="bl-pass">모르겠음</button>
                <button class="btn" id="bl-submit">확인</button>
            </div>
            ${vkbHtml()}
        </div>
    `;

    const inputs = [...view.querySelectorAll('.cloze-input')];
    let activeInput = inputs[0];
    let hinted = false, done = false;
    setTimeout(() => inputs[0].focus(), 30);

    inputs.forEach((inp, k) => {
        inp.addEventListener('focus', () => { activeInput = inp; });
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); done ? next() : submit(false); }
        });
        // 빈칸 정답과 글자 수가 같아지면 자동으로 다음 빈칸으로
        inp.addEventListener('input', () => {
            if (normalizeAnswer(inp.value) === normalizeAnswer(answers[k]) && inputs[k + 1]) inputs[k + 1].focus();
        });
    });

    // 가상 키보드: 입력칸에 직접 글자를 넣고 input 이벤트를 발생시켜 위 로직을 그대로 재사용
    bindVkb(view.querySelector('.vkb'), {
        press(key) {
            if (key === 'enter') { done ? next() : submit(false); return; }
            if (done) return;
            const target = activeInput;
            if (!target || target.disabled) return;
            if (key === 'back') target.value = target.value.slice(0, -1);
            else {
                const k = inputs.indexOf(target);
                if (target.value.length >= answers[k].length) return;
                target.value += key;
            }
            target.dispatchEvent(new Event('input'));
        }
    });

    function submit(gaveUp) {
        if (done) return;
        const ok = !gaveUp && inputs.every((inp, k) => normalizeAnswer(inp.value) === normalizeAnswer(answers[k]));
        if (!gaveUp && !ok && inputs.some(inp => !inp.value.trim())) {
            toast('빈칸을 모두 채워 주세요');
            return;
        }
        done = true;
        inputs.forEach((inp, k) => {
            inp.disabled = true;
            inp.classList.add(normalizeAnswer(inp.value) === normalizeAnswer(answers[k]) ? 'ok' : 'ng');
        });
        bs.results.push({ id: it.id, kind: entry.kind, ok, hinted });
        if (ok) {
            burst();
            $('#blank-feedback').innerHTML = '';
            setTimeout(next, 650);
        } else {
            const full = it.cloze.replace(/\{([^}]+)\}/g, (_, a) => `<b>${esc(a)}</b>`);
            $('#blank-feedback').innerHTML = `<div class="reveal">정답 · ${full}<br><span style="color:var(--text-2)">표현: ${esc(it.expr)}</span></div>`;
            $('#bl-submit').textContent = '다음';
            $('#bl-hint').disabled = true;
            $('#bl-pass').disabled = true;
        }
    }
    function next() { bs.idx++; renderBlankPlay(mode); }

    $('#bl-submit').onclick = () => (done ? next() : submit(false));
    $('#bl-pass').onclick = () => submit(true);
    $('#bl-hint').onclick = () => {
        hinted = true;
        inputs.forEach((inp, k) => { if (!inp.value) inp.placeholder = answers[k][0] + '…'; });
        $('#hint-line').textContent = `힌트: 표현 원형은 "${it.expr}" (첫 글자 표시됨)`;
    };
}

// ───────── 가상 키보드 (빈칸 전용, 네이티브 키보드 대신 사용) ─────────
const VKB_ROWS = [
    { keys: 'qwertyuiop'.split('') },
    { keys: 'asdfghjkl'.split('') },
    { keys: [...'zxcvbnm'.split(''), { k: 'back', label: '⌫', cls: 'back', wide: true }] },
    { keys: [{ k: "'", cls: 'punct' }, { k: '-', cls: 'punct' }, { k: ' ', label: 'space', cls: 'space', grow: 4 }, { k: 'enter', label: '↵', cls: 'enter', wide: true }] }
];
const VOWEL_CLS = { a: 'v-blue', e: 'v-green', i: 'v-orange', o: 'v-pink', u: 'v-purple' };

function vkbHtml() {
    const row = r => `<div class="vkb-row">${r.keys.map(key => {
        const o = typeof key === 'string' ? { k: key } : key;
        const cls = [o.cls, VOWEL_CLS[o.k], o.wide ? 'wide' : ''].filter(Boolean).join(' ');
        return `<button class="vkb-key ${cls}" data-k="${esc(o.k)}" style="${o.grow ? `flex-grow:${o.grow}` : ''}" aria-label="${esc(o.label || o.k)}">${esc(o.label || o.k)}</button>`;
    }).join('')}</div>`;
    return `<div class="vkb" role="group" aria-label="가상 키보드">${VKB_ROWS.map(row).join('')}</div>`;
}

// pointerdown에서 기본 동작을 막아 입력칸 포커스가 빠지지 않게 한다
function bindVkb(el, { press }) {
    el.addEventListener('pointerdown', e => {
        const btn = e.target.closest('[data-k]');
        if (!btn) return;
        e.preventDefault();
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 120);
        press(btn.dataset.k);
    });
}

function applyBlankResults() {
    const b = state.blank;
    const moves = [];
    bs.results.forEach(r => {
        const inReview = b.review.find(x => x.id === r.id);
        if (r.kind === 'new') {
            // 힌트를 쓰고 맞춘 문장도 복습함으로 (명세서 5.4)
            if ((!r.ok || r.hinted) && !inReview) { b.review.push({ id: r.id, hits: 0 }); moves.push('review'); }
            else moves.push(null);
        } else if (r.kind === 'review') {
            if (r.ok && inReview) {
                inReview.hits++;
                if (inReview.hits >= BLANK_ABYSS_HITS) {
                    b.review = b.review.filter(x => x.id !== r.id);
                    b.abyss.push(r.id);
                    moves.push('abyss');
                } else moves.push(`hits:${inReview.hits}`);
            } else moves.push(r.ok ? null : 'stay');
        } else if (r.kind === 'abyss') {
            if (!r.ok) {
                b.abyss = b.abyss.filter(x => x !== r.id);
                b.review.push({ id: r.id, hits: 0 });
                moves.push('back');
            } else moves.push('abyss-keep');
        }
    });
    if (bs.mode === 'new') b.cursor += bs.queue.length;
    b.sessions++;
    saveBlank();
    return moves;
}

function renderBlankResult() {
    if (!bs) return go('blank');
    const moves = bs.applied || (bs.applied = applyBlankResults());
    const okCount = bs.results.filter(r => r.ok).length;
    const label = m => ({
        review: '<span class="pill to-review">→ 복습함</span>',
        abyss: '<span class="pill to-abyss">→ 🕳️ 심연</span>',
        back: '<span class="pill to-review">심연 → 복습함</span>',
        'abyss-keep': '<span class="pill to-abyss">심연 유지</span>',
        stay: '<span class="pill to-review">복습함 유지</span>'
    }[m] || (m && m.startsWith('hits:') ? `<span class="pill">복습 ${m.slice(5)}/${BLANK_ABYSS_HITS}</span>` : ''));
    setTop('세션 결과', 'blank');
    view.innerHTML = `
        <div class="result">
            <div class="result-icon">${okCount === bs.results.length ? '🏆' : '✍️'}</div>
            <div class="result-title">${okCount} / ${bs.results.length} 정답</div>
            <div class="result-sub">${bs.mode === 'new' ? `진도 ${state.blank.cursor.toLocaleString()} / ${MOCK.blankTotal.toLocaleString()} 문장` : `남은 복습 ${state.blank.review.length}개 · 심연 ${state.blank.abyss.length}개`}</div>
            <div class="result-list">
                ${bs.results.map((r, k) => {
                    const it = blankById(r.id);
                    return `<div class="result-item"><span class="mark">${r.ok ? '⭕' : '❌'}</span>
                        <span><span class="expr">${esc(it.expr)}</span>${r.hinted ? ' <span class="pill">힌트</span>' : ''}<br>
                        <span style="color:var(--text-2)">${esc(it.cloze.replace(/[{}]/g, ''))}</span></span>
                        <span class="move">${label(moves[k])}</span></div>`;
                }).join('')}
            </div>
            <div class="btn-row" style="margin-top:18px">
                ${state.blank.review.length ? '<button class="btn secondary" id="again-review">복습하기</button>' : ''}
                <button class="btn" id="again-new">다음 10문장</button>
            </div>
            <a class="btn ghost" href="#/blank">빈칸 홈으로</a>
        </div>
    `;
    const ar = $('#again-review');
    if (ar) ar.onclick = () => { bs = null; go('blank/play/review'); };
    $('#again-new').onclick = () => { bs = null; go('blank/play/new'); };
}

// ───────────────────────── 내 기록 ─────────────────────────
function renderMe() {
    setTop('내 기록', '');
    if (!state.user) {
        view.innerHTML = `
            <div class="card" style="text-align:center;padding:32px 20px">
                <div style="font-size:44px">🗂️</div>
                <div style="font-size:19px;font-weight:800;margin:10px 0 6px">로그인하면 기록을 볼 수 있어요</div>
                <div style="color:var(--text-2);font-size:14px;line-height:1.5">어떤 숙제를 했고 안 했는지,<br>빈칸 학습 진도와 복습 목록이 저장돼요.</div>
                <button class="btn" style="margin-top:18px" id="me-login">로그인</button>
            </div>`;
        $('#me-login').onclick = openLogin;
        return;
    }
    const u = state.user, b = state.blank;
    const orderTotal = MOCK.orderPackages.length, wordTotal = MOCK.wordQuizzes.length;
    const heat = Array.from({ length: 28 }, (_, k) => ['', 'l1', 'l2', 'l3'][(k * 7 + 3) % 5 % 4]);
    view.innerHTML = `
        <div class="card profile">
            <div class="avatar-lg">${esc(u.name[0])}</div>
            <div><div class="name">${esc(u.name)}</div><div class="provider">${u.provider === 'kakao' ? '카카오' : 'Google'} 계정 · 자동 로그인 ${store.get('user', null) ? '켜짐' : '꺼짐'}</div></div>
        </div>

        <div class="section-label">한눈에 보기</div>
        <div class="stat-grid">
            <div class="stat-tile order"><div class="k">영작 완료</div><div class="v">${state.orderDone.size} <small>/ ${orderTotal}</small></div><div class="progress-bar"><span style="width:${state.orderDone.size / orderTotal * 100}%"></span></div></div>
            <div class="stat-tile word"><div class="k">단어 테스트 통과</div><div class="v">${Object.keys(state.wordDone).length} <small>/ ${wordTotal}</small></div><div class="progress-bar"><span style="width:${Object.keys(state.wordDone).length / wordTotal * 100}%"></span></div></div>
            <div class="stat-tile blank"><div class="k">빈칸 진도</div><div class="v">${b.cursor} <small>문장</small></div><div class="progress-bar"><span style="width:${Math.max(1, b.cursor / MOCK.blankTotal * 100)}%"></span></div></div>
            <div class="stat-tile abyss"><div class="k">복습 / 심연</div><div class="v">${b.review.length} <small>/ ${b.abyss.length}</small></div><div class="progress-bar"><span style="width:${b.abyss.length / (b.abyss.length + b.review.length || 1) * 100}%"></span></div></div>
        </div>

        <div class="section-label">최근 4주 학습</div>
        <div class="card"><div class="heat">${heat.map(c => `<i class="${c}"></i>`).join('')}</div></div>

        <div class="section-label">영작 숙제</div>
        <div class="card" style="padding:4px 16px">
            ${MOCK.orderPackages.map((p, i) => `<div class="history-item">
                ${state.orderDone.has(i) ? '<span class="pill done">✓</span>' : '<span class="pill todo">—</span>'}
                <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.title)}</span>
                <span class="when">${state.orderDone.has(i) ? '🎤 32%' : esc(p.date)}</span>
            </div>`).join('')}
        </div>

        <button class="btn secondary" style="margin-top:20px" id="logout">로그아웃</button>
        <p class="proto-note">로그아웃해도 이 기기에서는 계속 학습할 수 있어요.</p>
    `;
    $('#logout').onclick = logout;
}

render();
