/**
 * FastLabBuilderDemo: FAST's Lab Builder, recreated, playing by itself until you take over.
 *
 * Ported from the accepted prototype docs/prototypes/lab-builder-demo-v2.html (option A: the brief
 * above the lab; the trace opens on click). Left column: the current question, or the narration of
 * what Lab Builder is doing (observability). Right column: your answers collect as a brief, and the
 * draft shows which answer each part came from (traceability). After the draft the lab folds to a
 * header strip; subjects come from database candidates only, and an invented pick is dropped; a
 * revision in your own words changes the board in place, says what changed, and can be undone
 * (steerability).
 *
 * The run is a scripted ~60 s loop (src/data/demos/fast-lab-builder.js). The first pointer down or
 * focus inside takes over: the step that was running finishes at once and every control works.
 * Timers run on a clock that only advances while the demo is on screen (useOnScreen). With reduced
 * motion there is no autoplay: the demo opens on the finished board, ready to revise.
 *
 * The engine is the prototype's state machine, kept close to the original so the two can be read
 * side by side: one mutable state object, actions that change it, and a render after each.
 */
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import DemoFrame from '../_shared/DemoFrame.jsx';
import useOnScreen from '../_shared/useOnScreen.js';
import {
  QUESTIONS as Q, FOLLOW_UP as FU, LAB, DRAFT_STEPS, SUBJECT_RUNS as SUBJ, BOARD, UNCATEGORIZED, REQUESTS, cloneBoard as clone,
} from '../../../../data/demos/fast-lab-builder.js';
import './lab-builder.css';

const QTEXT = Object.fromEntries([...Q, FU].map((x) => [x.key, x.q]));
const LABEL = Object.fromEntries([...Q, FU].map((x) => [x.key, x.label]));
const noAnim = () => ({ leaving: [], arriving: [], moved: [], catLeaving: [], catNew: [], landing: false });

const fresh = () => ({
  at: 0,
  answers: Object.fromEntries(Q.map((q) => [q.key, Array.isArray(q.def) ? [...q.def] : q.def])),
  skipped: {}, answered: [], fuKnown: false, fuPicks: [...FU.def], fuText: '',
  phase: 'intake', run: null, drafted: 0, hiSrc: [], used: [], flash: [],
  sub: null, board: null, unc: [], anim: noAnim(),
  revision: null, pending: null, reviseText: '', msg: '', created: false, open: null, briefOpen: false, hiGoal: null,
});

const keys = (S) => Q.map((q) => q.key).concat(S.fuKnown ? ['fu'] : []);
const answerText = (S, k) => {
  if (k === 'fu') return [...S.fuPicks, S.fuText.trim()].filter(Boolean).join('; ') || null;
  if (S.skipped[k]) return null;
  const v = S.answers[k];
  return Array.isArray(v) ? (v.length ? v.join(', ') : null) : (v.trim() || null);
};
const skippedText = (k) => (k === 'broken' || k === 'who' ? 'I’m not sure yet' : k === 'where' ? 'Anywhere' : 'Skipped');
const isShown = (S, f) => S.phase !== 'intake' && DRAFT_STEPS.slice(0, S.drafted).some((s) => s.show.includes(f));
const countBoard = (S) => (S.board ? S.board.reduce((n, c) => n + c.subs.length, 0) : 0) + S.unc.length;
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* A clock that advances only while running: pausing it freezes every pending step. */
function makeClock() {
  let vt = 0, base = 0, running = false, handle = 0, q = [];
  const now = () => (running ? vt + (performance.now() - base) : vt);
  const arm = () => {
    clearTimeout(handle);
    if (!running || !q.length) return;
    q.sort((a, b) => a.at - b.at);
    handle = setTimeout(fire, Math.max(0, q[0].at - now()));
  };
  const fire = () => {
    const t = now() + 1;
    const due = q.filter((x) => x.at <= t);
    q = q.filter((x) => x.at > t);
    due.forEach((x) => x.fn());
    arm();
  };
  return {
    later(fn, ms) { q.push({ fn, at: now() + ms }); arm(); },
    clear() { q = []; clearTimeout(handle); },
    pause() { if (!running) return; vt = now(); running = false; clearTimeout(handle); },
    resume() { if (running) return; base = performance.now(); running = true; arm(); },
  };
}

function diff(before, after) {
  const where = (b) => { const m = new Map(); b.forEach((c) => c.subs.forEach((s) => m.set(s, c.name))); return m; };
  const was = where(before), now = where(after), addedTo = new Set(), add = [], mov = [], rem = [];
  now.forEach((cat, s) => { const o = was.get(s); if (o === undefined) { add.push(s); addedTo.add(cat); } else if (o !== cat) mov.push(s); });
  was.forEach((_, s) => { if (!now.has(s)) rem.push(s); });
  const bn = before.filter((c) => c.subs.length).map((c) => c.name), an = after.filter((c) => c.subs.length).map((c) => c.name);
  return { add, mov, rem, addedTo: [...addedTo], newCategories: an.filter((n) => !bn.includes(n)), removedCategories: bn.filter((n) => !an.includes(n)) };
}
function describe(d) {
  const p = [];
  if (d.newCategories.length) p.push(`new ${d.newCategories.length === 1 ? 'category' : 'categories'}: ${d.newCategories.join(', ')}`);
  if (d.removedCategories.length) p.push(`removed ${d.removedCategories.length === 1 ? 'category' : 'categories'}: ${d.removedCategories.join(', ')}`);
  if (d.mov.length) p.push(`${pl(d.mov.length, 'subject', 'subjects')} moved`);
  if (d.add.length) p.push(`${pl(d.add.length, 'subject', 'subjects')} added to ${d.addedTo.join(', ')}`);
  if (d.rem.length) p.push(`${pl(d.rem.length, 'subject', 'subjects')} removed`);
  if (d.removedCategories.length === 1 && d.newCategories.length === 1 && !d.add.length && !d.rem.length) {
    return { title: 'The subject board has been revised.', detail: `Renamed ${d.removedCategories[0]} to ${d.newCategories[0]}.` };
  }
  if (!p.length) return { title: 'Lab Builder left the board as it was.', detail: 'Nothing changed for that request. Name the categories or subjects you mean and say what should happen to them.' };
  const t = p.join(' · ');
  return { title: 'The subject board has been revised.', detail: t[0].toUpperCase() + t.slice(1) + '.' };
}

/* ═════════════ the engine: the prototype's state machine ═════════════ */
function createEngine(render, onPlaying) {
  const clock = makeClock();
  const later = (fn, ms) => clock.later(fn, ms);
  const E = { S: fresh(), auto: null, cur: null, root: null, clock };
  const renderAll = () => render();

  function runSeq(kind, title, sub, steps, done, stepMs = 1700) {
    const S = E.S;
    S.run = { kind, title, sub, lines: [] };
    renderAll();
    let i = 0;
    const next = () => {
      if (i > 0) { const prev = S.run.lines[i - 1]; prev.state = prev.warn ? 'warn' : 'done'; }
      if (i >= steps.length) { later(() => { S.run = null; S.hiSrc = []; done(); renderAll(); }, 500); renderAll(); return; }
      const st = steps[i++];
      S.run.lines.push({ text: st.line, state: 'now', warn: st.warn });
      st.apply?.();
      renderAll();
      later(next, st.ms || stepMs);
    };
    later(next, 450);
  }

  function nextQ() {
    const S = E.S, ks = keys(S), k = ks[S.at];
    if (!S.answered.includes(k)) S.answered.push(k);
    S.flash = ['b.' + k];
    if (k === 'where' && !S.fuKnown) {
      runSeq('followup', 'Reading your answers', 'Lab Builder may ask one or two more questions before the draft. A few seconds.',
        [{ line: 'Checking what the draft would have to guess', ms: 1300 }, { line: 'One question would change the draft', ms: 900 }],
        () => { S.fuKnown = true; S.at = ks.length; });
      return;
    }
    if (k === 'fu') { startDraft(); return; }
    S.at = Math.min(S.at + 1, keys(S).length - 1);
    renderAll();
  }
  function skipQ() {
    const S = E.S, k = keys(S)[S.at];
    if (k === 'fu') { S.fuPicks = []; S.fuText = ''; } else S.skipped[k] = true;
    nextQ();
  }
  function backQ() { if (E.S.at > 0) { E.S.at--; renderAll(); } }
  function startDraft() {
    const S = E.S;
    S.phase = 'draft'; S.drafted = 0;
    runSeq('draft', 'Drafting the lab', 'Name, description and goals, from what you wrote. Usually under a minute.',
      DRAFT_STEPS.map((d, i) => ({ line: d.line, apply: () => { S.drafted = i + 1; S.hiSrc = d.src; S.used = [...new Set([...S.used, ...d.src])]; S.flash = d.show; } })),
      () => { S.drafted = DRAFT_STEPS.length; }, 1600);
  }
  function startSubjects() {
    const S = E.S;
    S.phase = 'subjects'; S.briefOpen = false; S.open = null;
    const steps = [];
    SUBJ.forEach((g, gi) => {
      const gname = LAB.goals[gi].name.t;
      steps.push({ line: `Search terms for “${gname}”`, apply: () => { S.hiGoal = gi; S.sub = { gi, pool: false, picks: false, fakeGone: false }; }, ms: 1500 });
      steps.push({ line: `${g.total} candidates from the database`, apply: () => { S.sub.pool = true; }, ms: 1500 });
      steps.push({ line: `Picked ${g.picks.length} that fit the goal`, apply: () => { S.sub.picks = true; }, ms: g.fake ? 1300 : 1500 });
      if (g.fake) steps.push({ line: '1 pick was not in the results, so it was dropped', warn: true, apply: () => { S.sub.fakeGone = true; }, ms: 1500 });
    });
    steps.push({ line: 'Sorting 16 subjects into 5 categories', apply: () => { S.sub = null; S.hiGoal = null; S.board = clone(BOARD); S.unc = [...UNCATEGORIZED]; S.anim = { ...noAnim(), landing: true }; }, ms: 1400 });
    runSeq('subjects', 'Finding subjects', 'Searching the database for each goal, then judging what fits. One to two minutes.', steps,
      () => { S.phase = 'board'; S.anim.landing = false; });
  }
  function revise() {
    const S = E.S, text = S.reviseText.trim();
    if (!text || S.run) return;
    const req = REQUESTS.find((p) => p.text.toLowerCase() === text.toLowerCase());
    if (!req) { S.msg = 'This recreation only knows the three requests above. In FAST, Lab Builder takes any request in your own words.'; renderAll(); return; }
    S.msg = ''; S.revision = null;
    const before = clone(S.board), after = req.apply(S.board), d = diff(before, after), lines = req.lines(before);
    S.pending = { before, after, text, d };
    const steps = lines.map((line, i) => ({ line, apply: () => {
      S.anim = noAnim();
      if (i === 1 && d.rem.length) { S.anim.leaving = d.rem; S.anim.catLeaving = d.removedCategories; }
      if (i === 1 && !d.rem.length && lines.length === 2) { S.board = after; S.anim.moved = d.mov; S.anim.catNew = d.newCategories; }
      if (i === 2) S.board = S.board.filter((c) => !d.removedCategories.includes(c.name)).map((c) => ({ ...c, subs: c.subs.filter((s) => !d.rem.includes(s)) }));
      if (i === 3) { S.board = after; S.anim.arriving = d.add; }
    } }));
    runSeq('subjects-revise', 'Revising the subject board', 'Applying your request. Anything you didn’t mention stays where it is.', steps, () => {
      S.board = after; S.reviseText = ''; S.pending = null; S.revision = { comment: text, previous: before, edited: false, ...describe(d) };
    }, 1500);
  }
  function edited() { if (E.S.revision) E.S.revision.edited = true; E.S.anim = noAnim(); }
  function moveSub(name, to) {
    const S = E.S;
    const from = S.unc.includes(name) ? '__unc' : S.board.find((c) => c.subs.includes(name))?.name;
    if (from === to) return;
    S.board.forEach((c) => { c.subs = c.subs.filter((s) => s !== name); });
    S.unc = S.unc.filter((s) => s !== name);
    if (to === '__unc') S.unc.push(name); else S.board.find((c) => c.name === to)?.subs.push(name);
    edited(); renderAll();
  }
  function removeSub(name) {
    const S = E.S;
    S.board.forEach((c) => { c.subs = c.subs.filter((s) => s !== name); });
    S.unc = S.unc.filter((s) => s !== name);
    edited(); renderAll();
  }

  /* ── the visitor's actions ── */
  E.act = (a, el) => {
    const S = E.S;
    if (a === 'next') { if (!S.run) nextQ(); } else if (a === 'skip') { if (!S.run) skipQ(); } else if (a === 'back') backQ();
    else if (a === 'region') { const v = el.dataset.v, w = S.answers.where; S.answers.where = w.includes(v) ? w.filter((x) => x !== v) : [...w, v]; S.skipped.where = false; renderAll(); }
    else if (a === 'fupick') { const v = el.dataset.v; S.fuPicks = S.fuPicks.includes(v) ? S.fuPicks.filter((x) => x !== v) : [...S.fuPicks, v]; renderAll(); }
    else if (a === 'subjects') startSubjects();
    else if (a === 'trace') { S.open = S.open === el.dataset.id ? null : el.dataset.id; renderAll(); }
    else if (a === 'briefopen') { S.briefOpen = true; renderAll(); }
    else if (a === 'preset') { S.reviseText = REQUESTS[+el.dataset.i].text; S.msg = ''; renderAll(); }
    else if (a === 'revise') revise();
    else if (a === 'undo') { if (S.revision && !S.revision.edited) { S.board = S.revision.previous; S.revision = null; edited(); renderAll(); } }
    else if (a === 'dismiss') { S.revision = null; renderAll(); }
    else if (a === 'rm') removeSub(el.dataset.v);
    else if (a === 'create') { S.created = true; renderAll(); }
    else if (a === 'replay') E.play();
  };
  E.input = (k, value) => {
    const S = E.S;
    if (k === 'fuText') S.fuText = value;
    else if (k === 'reviseText') { S.reviseText = value; S.msg = ''; }
    else { S.answers[k] = value; S.skipped[k] = false; }
    renderAll();
  };
  E.enter = (k) => { if (k === 'reviseText') revise(); else if (E.S.phase === 'intake' && !E.S.run) nextQ(); };
  E.move = moveSub;

  /* ── autoplay ── */
  function cursorTo(sel) {
    const t = E.root?.querySelector(sel);
    if (!t) return;
    const fr = E.root.getBoundingClientRect(), r = t.getBoundingClientRect();
    E.cur = [r.left - fr.left + Math.min(r.width / 2, 40), r.top - fr.top + r.height / 2];
    renderAll();
  }
  function typeInto(key, text, done) {
    let i = 0;
    const step = () => {
      if (!E.auto) return;
      i = Math.min(text.length, i + 3);
      if (key === 'reviseText') E.S.reviseText = text.slice(0, i); else E.S.answers[key] = text.slice(0, i);
      renderAll();
      cursorTo(`[data-in="${key}"]`);
      if (i < text.length) later(step, 30); else later(done, 400);
    };
    step();
  }
  const click = (sel, fn, wait = 600) => { if (!E.auto) return; cursorTo(sel); later(() => { if (E.auto) fn(); }, wait); };
  const waitRun = (n) => { const w = () => { if (!E.auto) return; if (E.S.run) later(w, 200); else later(n, 300); }; w(); };
  const S_ = () => E.S;
  const SCRIPT = [
    (n) => { S_().answers.theme = ''; renderAll(); typeInto('theme', Q[0].def, n); },
    (n) => click('[data-act="next"]', () => { nextQ(); later(n, 400); }),
    (n) => { S_().answers.goals = ''; renderAll(); typeInto('goals', Q[1].def, n); },
    (n) => click('[data-act="next"]', () => { nextQ(); later(n, 400); }),
    (n) => { S_().answers.broken = ''; renderAll(); typeInto('broken', Q[2].def, n); },
    (n) => click('[data-act="next"]', () => { nextQ(); later(n, 500); }),
    (n) => click('[data-act="skip"]', () => { skipQ(); later(n, 500); }),
    (n) => {
      S_().answers.where = []; renderAll();
      click('[data-v="Sub-Saharan Africa"]', () => {
        S_().answers.where = ['Sub-Saharan Africa']; renderAll();
        click('[data-v="South Asia"]', () => { S_().answers.where = ['Sub-Saharan Africa', 'South Asia']; renderAll(); later(n, 300); });
      });
    },
    (n) => click('[data-act="next"]', () => { nextQ(); waitRun(n); }),
    (n) => { S_().fuPicks = []; renderAll(); click('[data-v="By 2035"]', () => { S_().fuPicks = ['By 2035']; renderAll(); later(n, 500); }); },
    /* draft */ (n) => click('[data-act="next"]', () => { nextQ(); waitRun(n); }),
    /* open one trace */ (n) => click('[data-id="g0.who"]', () => { S_().open = 'g0.who'; renderAll(); later(n, 2600); }, 900),
    /* subjects */ (n) => click('[data-act="subjects"]', () => { S_().open = null; startSubjects(); waitRun(n); }),
    (n) => later(n, 1600),
    /* revise */ (n) => typeInto('reviseText', REQUESTS[0].text, n),
    (n) => click('[data-act="revise"]', () => { revise(); waitRun(n); }),
    (n) => later(n, 3200),
    (n) => click('[data-act="create"]', () => { S_().created = true; renderAll(); later(n, 3000); }),
    (n) => { E.S = fresh(); E.auto.i = 0; E.cur = null; renderAll(); n(); },
  ];

  E.play = () => {
    clock.clear();
    E.cur = null; E.S = fresh(); E.auto = { i: 0 };
    onPlaying(true); renderAll();
    const go = () => { if (!E.auto) return; SCRIPT[E.auto.i++](go); };
    later(go, 700);
  };
  /* Reduced motion: the finished board, ready to revise. */
  E.settle = () => {
    clock.clear();
    const S = fresh();
    S.answered = keys({ fuKnown: true }); S.fuKnown = true; S.skipped.who = true; S.used = S.answered;
    S.at = keys(S).length - 1; S.phase = 'board'; S.drafted = DRAFT_STEPS.length;
    S.board = clone(BOARD); S.unc = [...UNCATEGORIZED];
    E.S = S; E.auto = null; E.cur = null; onPlaying(false); renderAll();
  };
  E.takeOver = () => {
    if (!E.auto) return;
    E.auto = null; clock.clear();
    const S = E.S;
    if (S.run) {
      /* finish the step that was running, without the wait */
      const k = S.run.kind;
      S.run = null; S.hiSrc = [];
      if (k === 'followup') { S.fuKnown = true; S.at = keys(S).length - 1; }
      if (k === 'draft') { S.drafted = DRAFT_STEPS.length; S.used = [...new Set(DRAFT_STEPS.flatMap((d) => d.src))]; S.flash = []; }
      if (k === 'subjects') { S.sub = null; S.hiGoal = null; S.board = clone(BOARD); S.unc = [...UNCATEGORIZED]; S.phase = 'board'; S.anim = noAnim(); }
      if (k === 'subjects-revise' && S.pending) {
        const { before, after, text, d } = S.pending;
        S.board = after; S.reviseText = ''; S.pending = null;
        S.anim = { ...noAnim(), arriving: d.add, moved: d.mov, catNew: d.newCategories };
        S.revision = { comment: text, previous: before, edited: false, ...describe(d) };
      }
    }
    onPlaying(false); renderAll();
  };
  return E;
}

/* ═════════════ left column ═════════════ */
function QuestionCard({ S, E }) {
  const ks = keys(S), k = ks[S.at], isFu = k === 'fu', m = isFu ? FU : Q.find((q) => q.key === k);
  const id = `lbd-${k}`;
  const onKey = (e) => {
    if (e.key !== 'Enter' || (e.target.tagName === 'TEXTAREA' && !(e.metaKey || e.ctrlKey))) return;
    e.preventDefault(); E.enter(k);
  };
  let control;
  if (isFu) {
    control = (
      <>
        <div className="lbd-chips" role="group" aria-labelledby={id}>
          {FU.options.map((o) => <button key={o} type="button" className="lbd-chip" aria-pressed={S.fuPicks.includes(o)} data-act="fupick" data-v={o}>{o}</button>)}
        </div>
        <input className="lbd-field" style={{ marginTop: 8 }} data-in="fuText" aria-label="Your own words" value={S.fuText} placeholder="Or say it in your own words…" onChange={(e) => E.input('fuText', e.target.value)} onKeyDown={onKey} />
      </>
    );
  } else if (m.kind === 'regions') {
    control = (
      <div className="lbd-chips" role="group" aria-labelledby={id}>
        {m.options.map((o) => <button key={o} type="button" className="lbd-chip" aria-pressed={S.answers.where.includes(o)} data-act="region" data-v={o}>{o}</button>)}
      </div>
    );
  } else if (m.kind === 'textarea') {
    control = <textarea id={`${id}-in`} className="lbd-field" rows={4} data-in={k} placeholder={m.ph} value={S.answers[k]} onChange={(e) => E.input(k, e.target.value)} onKeyDown={onKey} />;
  } else {
    control = <input id={`${id}-in`} className="lbd-field" data-in={k} placeholder={m.ph} value={S.answers[k]} onChange={(e) => E.input(k, e.target.value)} onKeyDown={onKey} />;
  }
  const Lbl = isFu || m.kind === 'regions' ? 'div' : 'label';
  return (
    <div className="lbd-qcard">
      <span className="lbd-micro">{isFu ? 'Lab Builder asks' : 'Question'} {S.at + 1} of {Q.length + (S.fuKnown ? 1 : 0)}</span>
      <Lbl className="lbd-q" id={id} {...(Lbl === 'label' ? { htmlFor: `${id}-in` } : {})}>{m.q}</Lbl>
      <div className="lbd-hint">{m.hint}</div>
      <div>{control}</div>
      <div className="lbd-acts">
        {S.at > 0 && <button type="button" className="lbd-btn" data-act="back">← Back</button>}
        <button type="button" className="lbd-btn pri" data-act="next">{isFu ? 'Done' : 'Next →'}</button>
        {(m.skip || isFu) && <button type="button" className="lbd-btn ter" data-act="skip">{m.skip || 'Skip'}</button>}
      </div>
    </div>
  );
}

function Narration({ run, quiet }) {
  return (
    <div className="lbd-narr" role="status" aria-live={quiet ? 'off' : 'polite'}>
      <span className="lbd-micro">Lab Builder</span>
      <div className="lbd-narr-title">{run.title}</div>
      <div className="lbd-narr-sub">{run.sub}</div>
      <ol>{run.lines.map((l, i) => <li key={i} className={l.state}><span className="lbd-m" /><span>{l.text}</span></li>)}</ol>
    </div>
  );
}

function RevisionNote({ r }) {
  if (!r) return null;
  return (
    <div className="lbd-note" role="status">
      <span className="lbd-note-i" aria-hidden="true">i</span>
      <div>
        <div className="lbd-note-t">{r.title}</div>
        <div className="lbd-note-d">{r.detail}</div>
        <div className="lbd-note-y">You asked: “{r.comment}”</div>
        <div className="lbd-note-a">
          {r.edited
            ? <span className="lbd-note-d" style={{ margin: 0 }}>You have edited since, so Undo is off.</span>
            : <button type="button" className="lbd-btn" data-act="undo">Undo revision</button>}
          <button type="button" className="lbd-btn ter" data-act="dismiss">Dismiss</button>
        </div>
      </div>
    </div>
  );
}

function Left({ S, E }) {
  if (S.run) return <Narration run={S.run} quiet={!!E.auto} />;
  if (S.created) {
    return (
      <div className="lbd-qcard">
        <span className="lbd-micro">Recreation</span>
        <div className="lbd-q">The lab would open now.</div>
        <div className="lbd-hint">Nothing was created. In FAST the new lab opens on its Plan tab.</div>
        <div className="lbd-acts"><button type="button" className="lbd-btn" data-act="replay">Watch again</button></div>
      </div>
    );
  }
  if (S.phase === 'intake') return <QuestionCard S={S} E={E} />;
  if (S.phase === 'draft') {
    return (
      <div className="lbd-qcard">
        <span className="lbd-micro">Lab and goals</span>
        <div className="lbd-q">The draft is on the right.</div>
        <div className="lbd-hint">Click any part of it to see which answer it came from.</div>
        <div className="lbd-acts"><button type="button" className="lbd-btn pri" data-act="subjects">Find subjects →</button></div>
      </div>
    );
  }
  return (
    <>
      <RevisionNote r={S.revision} />
      <div>
        <label className="lbd-rev-lab" htmlFor="lbd-revise">Tell Lab Builder what to change</label>
        <textarea id="lbd-revise" className="lbd-field" rows={2} data-in="reviseText" placeholder="Ask for any change…" value={S.reviseText}
          onChange={(e) => E.input('reviseText', e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); E.enter('reviseText'); } }} />
        <div className="lbd-try">
          {REQUESTS.map((p, i) => <button key={i} type="button" className="lbd-chip" data-act="preset" data-i={i}>{p.text}</button>)}
          <span className="lbd-tag">DEMO REQUESTS</span>
        </div>
        {S.msg && <div className="lbd-msg">{S.msg}</div>}
        <div className="lbd-acts" style={{ marginTop: 10 }}>
          <button type="button" className="lbd-btn" data-act="revise" disabled={!S.reviseText.trim()}>Revise</button>
        </div>
      </div>
      <div className="lbd-done lbd-qcard">
        <div className="lbd-q" style={{ fontSize: 15 }}>Does everything look good?</div>
        <div className="lbd-acts"><button type="button" className="lbd-btn pri" data-act="create">Create lab</button></div>
      </div>
    </>
  );
}

/* ═════════════ right column ═════════════ */
function Quote({ S, v }) {
  if (v.guess) return <div className="lbd-quote">Lab Builder drafted this because you answered “I’m not sure yet” to <q>{QTEXT[v.src[0]]}</q> Edit it or keep it.</div>;
  return (
    <div className="lbd-quote">
      {v.src.map((s) => <div key={s}>From your answer to “{QTEXT[s]}”: <q>{answerText(S, s) || skippedText(s)}</q></div>)}
    </div>
  );
}

function Field({ S, id, label, v, big, mut, fkey }) {
  const tr = !S.run && S.phase !== 'intake';
  const open = S.open === id;
  const cls = ['lbd-fld', tr && 'tr', open && 'open', S.flash.includes(fkey) && 'lbd-arrive'].filter(Boolean).join(' ');
  const a = tr ? { 'data-act': 'trace', 'data-id': id, role: 'button', tabIndex: 0, 'aria-expanded': open } : {};
  return (
    <div className={cls} {...a}>
      <div className="lbd-fl">
        <span className="lbd-micro">{label}</span>
        {v.guess && <span className="lbd-pchip" title="Lab Builder guessed this. Edit or keep.">PLACEHOLDER</span>}
      </div>
      <div className={`lbd-fv${big ? ' big' : ''}${mut ? ' mut' : ''}`}>{v.t}</div>
      {open && <Quote S={S} v={v} />}
    </div>
  );
}

function BriefRows({ S }) {
  const ks = keys(S).filter((k) => S.answered.includes(k));
  if (!ks.length) return <div className="lbd-empty">Your answers collect here as you give them.</div>;
  return (
    <div className="lbd-brief">
      {ks.map((k) => {
        const v = answerText(S, k);
        const cls = ['lbd-brow', S.hiSrc.includes(k) && 'hi', S.phase === 'draft' && S.used.includes(k) && 'used', S.flash.includes('b.' + k) && 'lbd-arrive'].filter(Boolean).join(' ');
        return <div key={k} className={cls}><span className="k">{LABEL[k]}</span><span className={`v${v ? '' : ' sk'}`}>{v || skippedText(k)}</span></div>;
      })}
    </div>
  );
}

function LabFields({ S }) {
  const sh = (f) => isShown(S, f);
  return (
    <div className="lbd-lab">
      {sh('name') && <Field S={S} id="name" label="Lab name" v={LAB.name} big fkey="name" />}
      {sh('desc') && <Field S={S} id="desc" label="What is this lab trying to learn?" v={LAB.desc} mut fkey="desc" />}
      {sh('g.name') && LAB.goals.map((g, gi) => {
        const f = (k, label) => (sh('g.' + k) ? <Field S={S} id={`g${gi}.${k}`} label={label} v={g[k]} fkey={'g.' + k} /> : null);
        return (
          <div key={gi} className={`lbd-goal${S.flash.includes('g.name') ? ' lbd-arrive' : ''}`}>
            <Field S={S} id={`g${gi}.name`} label={`Goal ${gi + 1}`} v={g.name} fkey="g.name" />
            {f('desc', 'What success means')}
            <div className="lbd-grid">{f('problem', 'Problem')}{f('who', 'Target demographics')}{f('where', 'Regions')}{f('horizon', 'Target horizon year')}</div>
          </div>
        );
      })}
    </div>
  );
}

function BriefAndLab({ S }) {
  const collapsed = S.phase === 'draft' && !S.run && !S.briefOpen;
  const sticky = S.phase === 'draft' && S.run;
  return (
    <>
      <div className={sticky ? 'lbd-stick' : 'lbd-sect'}>
        <span className="lbd-micro" style={{ display: 'block', marginBottom: 8 }}>Your brief</span>
        {collapsed
          ? <button type="button" className="lbd-briefline" data-act="briefopen"><b>{S.answered.length} answers</b><span>Show</span></button>
          : <BriefRows S={S} />}
      </div>
      <div className="lbd-sect">
        <span className="lbd-micro">Your lab</span>
        {S.phase !== 'intake' && S.drafted
          ? <LabFields S={S} />
          : <div className="lbd-empty">Lab Builder drafts the lab from the brief above once you’ve answered.</div>}
      </div>
    </>
  );
}

function Strip({ S }) {
  const tr = !S.run;
  const opened = S.open && S.open.startsWith('strip.') ? +S.open.split('.')[1] : null;
  const g = opened !== null ? LAB.goals[opened] : null;
  const names = { name: 'Goal', problem: 'Problem', where: 'Regions', horizon: 'Horizon', who: 'Demographics' };
  return (
    <div className="lbd-strip">
      <div className="lbd-strip-ln">{LAB.name.t}</div>
      <div className="lbd-gs">
        {LAB.goals.map((gg, gi) => (
          <button key={gi} type="button" className={`lbd-gchip${tr ? ' tr' : ''}${S.hiGoal === gi ? ' hi' : ''}`}
            {...(tr ? { 'data-act': 'trace', 'data-id': `strip.${gi}`, 'aria-expanded': opened === gi } : { tabIndex: -1 })}>
            {gg.name.t}
          </button>
        ))}
      </div>
      {g && (
        <div className="lbd-quote">
          {Object.keys(names).map((k) => (
            <div key={k} className="lbd-gq">
              <span className="lbd-micro">{names[k]}</span><br />
              {g[k].t} <span className="from">· {g[k].guess ? 'drafted for you to check' : 'from ' + g[k].src.map((s) => LABEL[s]).join(' + ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pipeline({ s }) {
  const g = SUBJ[s.gi];
  const pool = s.pool ? [...g.picks.slice(0, 4), g.rest[0], ...g.picks.slice(4, 7), g.rest[1], g.rest[2], ...g.picks.slice(7), ...g.rest.slice(3)] : [];
  return (
    <div>
      <div className="lbd-sect">
        <span className="lbd-micro">Search terms · goal {s.gi + 1}</span>
        <div className="lbd-terms">{g.terms.map((t) => <span key={t} className="lbd-term">{t}</span>)}</div>
      </div>
      {s.pool && (
        <div className="lbd-sect">
          <span className="lbd-micro">Candidates from the database · {g.total}</span>
          <div className="lbd-pool">
            {pool.map((p) => <span key={p} className={`lbd-pill${s.picks ? (g.picks.includes(p) ? ' pick' : ' drop') : ''}`}><span className="lbd-dot" />{p}</span>)}
            {s.picks && g.fake && !s.fakeGone && <span className="lbd-pill fake"><span className="lbd-dot" />{g.fake}</span>}
            {s.fakeGone && <span className="lbd-pill fake gone"><span className="lbd-dot" />{g.fake} · not in the database</span>}
            <span className="lbd-more">+{g.total - pool.length} more</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Board({ S, over }) {
  const a = S.anim;
  const cls = (s) => (a.leaving.includes(s) ? ' leaving' : a.arriving.includes(s) ? ' arriving' : a.moved.includes(s) ? ' moved' : a.landing ? ' landing' : '');
  const sub = (s) => (
    <div key={s} className={`lbd-sub${cls(s)}`} draggable="true" data-sub={s}>
      <span className="lbd-dot" />{s}
      <button className="lbd-x" type="button" data-act="rm" data-v={s} aria-label={`Remove ${s}`} title="Remove">×</button>
    </div>
  );
  return (
    <div className="lbd-sect">
      <span className="lbd-micro">Subjects · {countBoard(S)}</span>
      <div className="lbd-board">
        {S.unc.length > 0 && <div className={`lbd-unc${over === '__unc' ? ' over' : ''}`} data-drop="__unc"><span className="lbd-unc-h">Uncategorized</span>{S.unc.map(sub)}</div>}
        <div className="lbd-cats">
          {S.board.filter((c) => c.subs.length).map((c) => (
            <div key={c.name} className={`lbd-cat${a.catLeaving.includes(c.name) ? ' leaving' : ''}${a.catNew.includes(c.name) ? ' newcat' : ''}${over === c.name ? ' over' : ''}`} data-drop={c.name}>
              <div className="lbd-ch"><b>{c.name}</b><span className="lbd-micro">{c.subs.length}</span></div>
              {c.subs.map(sub)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Right({ S, over }) {
  if (S.phase === 'intake' || S.phase === 'draft') return <BriefAndLab S={S} />;
  return <><Strip S={S} />{S.sub ? <Pipeline s={S.sub} /> : S.board ? <Board S={S} over={over} /> : null}</>;
}

/* ═════════════ the island ═════════════ */
function LabBuilder({ onPlaying }) {
  const [, render] = useReducer((x) => x + 1, 0);
  const engine = useRef(null);
  if (!engine.current) engine.current = createEngine(render, onPlaying);
  const E = engine.current, S = E.S;
  const rootRef = useRef(null), leftRef = useRef(null), rightRef = useRef(null);
  const visible = useOnScreen(rootRef);
  const swallow = useRef(false);
  const lastRun = useRef(null);
  const lastTouch = useRef(0);
  const [over, setOver] = useState(null);
  const dragging = useRef(null);

  /* start: the loop, or the settled board with reduced motion */
  useEffect(() => {
    E.root = rootRef.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) E.settle(); else E.play();
    return () => E.clock.clear();
  }, [E]);

  /* the clock runs only while the demo is on screen */
  useEffect(() => { if (visible) E.clock.resume(); else E.clock.pause(); }, [visible, E]);

  /* keep the newest change in view, as the prototype does, but only when something new happened,
     so typing never pulls the column back from where the visitor scrolled it */
  const seen = useRef('');
  useLayoutEffect(() => {
    const R = rightRef.current;
    const sig = [S.phase, S.flash.join(), S.run?.lines.length, S.sub && JSON.stringify(S.sub), S.anim.leaving.length, S.anim.arriving.length, S.anim.moved.length].join('|');
    const isNew = sig !== seen.current;
    seen.current = sig;
    if (R && isNew && (S.run || S.phase === 'intake')) {
      const target = ['.lbd-arrive', '.lbd-sub.arriving', '.lbd-sub.leaving', '.lbd-sub.moved', '.lbd-pill.fake', '.lbd-pool', '.lbd-terms', '.lbd-brow.hi']
        .map((q) => R.querySelector(q)).find(Boolean);
      if (target) {
        let t = 0, n = target;
        while (n && n !== R) { t += n.offsetTop; n = n.offsetParent; }
        const stk = R.querySelector('.lbd-stick');
        t -= 40 + (stk ? stk.offsetHeight : 0);
        if (t > R.scrollTop + R.clientHeight - 140 || t < R.scrollTop) R.scrollTop = Math.max(0, t);
      }
    }
    if (S.run && S.run !== lastRun.current && leftRef.current) leftRef.current.scrollTop = 0;
    lastRun.current = S.run;
  });

  /* take-over: the first press or focus inside stops the autoplay; that press does nothing else */
  const takeOver = useCallback(() => { if (E.auto) { E.takeOver(); return true; } return false; }, [E]);
  const onPointerDownCapture = (e) => {
    swallow.current = false;
    if (e.pointerType !== 'mouse') { lastTouch.current = performance.now(); return; }
    if (takeOver()) { e.preventDefault(); swallow.current = true; }
  };
  const onClickCapture = (e) => {
    if (swallow.current || takeOver()) { swallow.current = false; e.preventDefault(); e.stopPropagation(); }
  };
  /* keyboard focus takes over; a tap focuses before its click, so that click is swallowed too */
  const onFocusCapture = () => { if (takeOver() && performance.now() - lastTouch.current < 1000) swallow.current = true; };
  const onClick = (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || !rootRef.current.contains(b)) return;
    E.act(b.dataset.act, b);
  };
  const onKeyDown = (e) => {
    const b = e.target.closest?.('[data-act="trace"]');
    if (b && b.getAttribute('role') === 'button' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); E.act('trace', b); }
  };

  /* drag subjects between categories */
  const onDragStart = (e) => { const s = e.target.closest?.('[data-sub]'); if (s) { dragging.current = s.dataset.sub; e.dataTransfer.setData('text/plain', dragging.current); } };
  const onDragOver = (e) => { const d = e.target.closest?.('[data-drop]'); if (d && dragging.current) { e.preventDefault(); if (over !== d.dataset.drop) setOver(d.dataset.drop); } };
  const onDrop = (e) => { const d = e.target.closest?.('[data-drop]'); if (d && dragging.current) { e.preventDefault(); E.move(dragging.current, d.dataset.drop); } dragging.current = null; setOver(null); };
  const onDragEnd = () => { dragging.current = null; setOver(null); };

  return (
    // The handlers only route events from the buttons, fields and cards inside, which carry their own roles.
    <div
      ref={rootRef}
      className={`lbd${visible ? '' : ' lbd-paused'}`}
      onPointerDownCapture={onPointerDownCapture}
      onFocusCapture={onFocusCapture}
      onClickCapture={onClickCapture}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="lbd-fhead">
        <span className="lbd-title">New lab</span>
        <span className="lbd-micro">Lab Builder</span>
        <span className="lbd-team">in <b>Demo team</b></span>
        <span className="lbd-micro lbd-ns">Not saved until you create</span>
      </div>
      <div className="lbd-split">
        <div className="lbd-col lbd-left" ref={leftRef}><Left S={S} E={E} /></div>
        <div className="lbd-col lbd-right" ref={rightRef}><Right S={S} over={over} /></div>
      </div>
      {E.auto && (
        <>
          <span className="lbd-take">Playing · click or tap to take over</span>
          <span className="lbd-cursor" aria-hidden="true" style={E.cur ? { left: E.cur[0], top: E.cur[1] } : { opacity: 0 }} />
        </>
      )}
    </div>
  );
}

export default function FastLabBuilderDemo() {
  const [playing, setPlaying] = useState(true);
  return (
    <DemoFrame
      title={<>LAB BUILDER<span className={`lbd-state${playing ? ' on' : ''}`}>{playing ? '● PLAYING' : 'YOU’RE DRIVING'}</span></>}
      label="recreation"
      height="var(--lbd-h, 600px)"
      fill
    >
      <LabBuilder onPlaying={setPlaying} />
    </DemoFrame>
  );
}
