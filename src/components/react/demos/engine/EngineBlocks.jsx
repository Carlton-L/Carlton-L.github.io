/**
 * The Engine Blocks prototype (docs/prototypes/engine-blocks-smr.html), ported from htm on UMD
 * scripts to JSX. Runs in its own document, /demos/engine/ (FrameEntry.jsx), on the made-up run in
 * src/data/demos/engine/. A RECREATION: the Engine is recreation-only. Seams: PORT.md.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, Handle, useReactFlow, useStore, applyNodeChanges, BaseEdge, EdgeLabelRenderer } from '@xyflow/react';
import { RUN, STORY, STEER, FACTS, CATP, KIND, P, D, G, LEVELS, BLOCKS, CHAPTERS, REPORT_OUTLINE, PARENT, ORDER_CHAIN, LINKS_ALL, PARAMS, PRODUCTS, XW, KBR, TL } from '../../../../data/demos/engine/smr-run.js';
import { simulate } from './sim.js';

const Ctx = createContext({});

/* ---------- data helpers ---------- */
const WS = CHAPTERS; // workstreams
const HK = new Set();
const KBW = new Set(Object.keys(KBR.research));   // research jobs that file pages
const FILES = KBR.files, isFile = id => !!FILES[id], NEEDS = KBR.needs;
const isReader = id => !!NEEDS[id];
const fileShort = f => FILES[f].title.replace(' research', '');
const needsText = r => NEEDS[r].map(fileShort).join(' + ');
KIND['kb/file'] = ['File in knowledgebase', 'kb'];
CATP['kb/file'] = [['pages', 'Filed', 'R']];
Object.keys(CATP).forEach(k => { if (k.startsWith('agent/')) CATP[k] = CATP[k].map(p => p[0] === 'kb' ? [p[0], p[1], 'G'] : p); });

let SIM = null, SEG = TL.segs, SLEN = [], DTOT = 0, TEND = TL.end;
const useSim = sim => { SIM = sim; SEG = sim.segs; SLEN = SEG.map(([a, b]) => b - a); DTOT = SLEN.reduce((a, b) => a + b, 0); TEND = sim.end; };
const toD = t => { let d = 0; for (let k = 0; k < SEG.length; k++) { const [a, b] = SEG[k]; if (t <= b) return d + Math.max(0, t - a); d += SLEN[k]; } return DTOT; };
const toT = d => { for (let k = 0; k < SEG.length; k++) { if (d <= SLEN[k]) return SEG[k][0] + d; d -= SLEN[k]; } return TEND; };
const atEnd = t => t >= TEND - 0.5;
const fileState = (f, t) => {
  if (f === 'kb_q') { const q = SIM.q; if (t < q.failAt) return 'wait'; if (t < q.run2[0]) return 'failed'; if (t + 0.01 < q.run2[1]) return 'retry'; return 'filed'; }
  return t + 0.01 < SIM.fin[FILES[f].research] ? 'wait' : 'filed';
};
const stepState = (id, t) => atEnd(t) && isRerunning(id) ? 'running' : atEnd(t) && isNewRun(id) ? 'done' : stepState0(id, t);
const stepState0 = (id, t) => {
  if (isFile(id)) return fileState(id, t);
  if (/^T20/.test(id)) return stepState('58', t);
  const i = info(id); if (!i) return 'wait';
  if (i.notRun) return t >= 206 ? 'skipped' : 'wait';
  if (i.skipped || id in SIM.skipAt) return t >= (SIM.skipAt[id] || 0) ? 'skipped' : 'wait';
  if (id === '182') { const q = SIM.q; if (t < q.try1[0]) return 'wait'; if (t < q.try1[1]) return 'running'; if (t < q.run2[0]) return 'failed'; if (t + 0.01 < q.run2[1]) return 'running'; return 'done'; }
  const s = SIM.start[id]; if (s == null) return 'wait';
  if (t < s) { const p = SIM.paused[id]; return p && t >= p[0] ? 'paused' : 'wait'; }
  if (t + 0.01 < SIM.fin[id]) return 'running';
  return 'done';
};
const boxState = (id, t) => {
  const ss = stepsOf(id).filter(x => !isFile(x)).map(x => stepState(x, t));
  if (ss.includes('running')) return 'running';
  if (ss.every(x => x === 'done' || x === 'skipped')) return 'done';
  if (ss.includes('paused')) return 'paused';
  if (ss.includes('failed')) return 'failed';
  return ss.some(x => x === 'done') ? 'part' : 'wait';
};
const nodeState = (id, t) => isFile(id) ? null : (WS[id] || BLOCKS[id]) ? boxState(id, t) : (info(id) ? stepState(id, t) : null);
const searchingWithout = (id, t) => isReader(id) && NEEDS[id].includes('kb_q') && stepState(id, t) === 'running' && SIM.without[id];
const filesOf = id => { const ss = stepsOf(id); const s = new Set(); ss.forEach(x => { if (isFile(x)) s.add(x); (NEEDS[x] || []).forEach(f => s.add(f)); }); return [...s]; };
const dotState = (id, t) => {
  const fs = filesOf(id); if (!fs.length) return null;
  const ss = fs.map(f => fileState(f, t));
  if (ss.includes('failed')) return 'red';
  if (ss.every(s => s === 'filed')) return 'green';
  return ss.includes('filed') ? 'amber' : 'gray';
};
const DOTW = { gray: 'Nothing it needs is filed yet', amber: 'Some of what it needs is filed', green: 'Everything it needs is filed', red: 'A filing it needs failed' };
const fmtClock = t => t >= 3600 ? (t / 3600).toFixed(1) + ' h' : t >= 60 ? Math.floor(t / 60) + ' min ' + String(Math.floor(t % 60)).padStart(2, '0') + ' s' : Math.round(t) + ' s';
const fmtCount = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const fmtT = s => s == null ? '' : s >= 3600 ? (s / 3600).toFixed(1) + ' h' : s >= 60 ? (s / 60).toFixed(1) + ' min' : (s < 1 ? s.toFixed(1) : Math.round(s)) + ' s';
const INFO = {};
const info0 = id => {
  if (INFO[id]) return INFO[id];
  const g = G[id], x = P[id] || D[id];
  if (!g && !x) return null;
  INFO[id] = x ? { ...g, ...x, settings: { ...(x.settings || {}) }, rich: !!P[id] } : g;
  if (x && g && g.settings && g.settings['Run inputs in settings']) INFO[id].settings['Run inputs in settings'] = g.settings['Run inputs in settings'];
  return INFO[id];
};
const info = id => { const i = info0(id); return i ? steerInfo(id, i) : i; };
const kindOf = id => { const i = info(id); return i ? KIND[i.type] : ['', '']; };
const isAI = id => kindOf(id)[1] === 'ai';
const isBox = id => !!(WS[id] || BLOCKS[id]);
const boxOf = id => WS[id] || BLOCKS[id];
const stepsOf = id => WS[id] ? WS[id].steps : BLOCKS[id] ? BLOCKS[id].steps : [id];
const deep = ids => ids.flatMap(i => i === '58' ? [i, 'T201', 'T202', 'T203'] : [i]);
const sumOf = id => {
  const ids = (id === 'rep' ? ['105', '106'] : stepsOf(id)).filter(x => !isFile(x)), st = ids.map(info), dp = deep(ids).map(info);
  return { n: st.filter(s => !s.skipped && !s.notRun).length, skipped: st.filter(s => s.skipped).length, dur: st.reduce((a, s) => a + (s.dur || 0), 0),
    calls: dp.reduce((a, s) => a + (s.calls || 0), 0), rej: dp.reduce((a, s) => a + ((s.attempts || []).length), 0),
    notes: ids.filter(i => info(i).note || info(i).declined).map(i => [i, info(i).note]) };
};
const openTarget = id => id === '21' ? 'sg_tax' : id === '58' ? 'sg_topic' : (LEVELS[id] ? id : null);
const pathTo = id => { const p = []; let c = PARENT[id]; while (c) { p.unshift(c); c = PARENT[c]; } return p; };
const flagsText = f => {
  const R = /R/.test(f), T = /T/.test(f), O = /O/.test(f), N = /N/.test(f);
  if (/G/.test(f)) return 'From a knowledgebase gate. The step waits until the gate is ready, like any input, then searches what the gate names. Without this wire the step does not search the knowledgebase.';
  if (/A/.test(f)) return 'Automatic. Whatever it reads is filed in the run\'s knowledgebase.';
  if (O) return 'Order only. No data passes; this step waits for it.';
  if (R && T) return 'Required. If some feeding steps fail it runs with the rest; if all fail, it is skipped.';
  if (R) return 'Required. If the feeding step fails or is skipped, this step is skipped.';
  if (T && N) return 'Optional. Runs without it if the feeding step fails. Does not keep the step alive on its own.';
  if (T) return 'Optional. Runs without it if the feeding step fails.';
  return 'Optional. If wired and the feeding step fails, this step is skipped.';
};
const wsOf = id => { const p = pathTo(id); return p[1] || (WS[id] ? id : null); };
const placeOf = id => { const c = wsOf(id); return c ? WS[c].title : id === '105' || id === '106' ? 'Report' : ''; };
const isProduct = id => { const i = info(id); return i && ['report/section', 'viz/table', 'viz/chart', 'flow/foreach'].includes(i.type); };
const PIC = { section: '¶', figure: '▦', repeat: '⟳' };
const STW = { declined: 'declined', skipped: 'skipped', empty: 'nothing produced' };
// where each product sits in the report
const SLOT = {}; REPORT_OUTLINE.forEach(([t, items], k) => items.forEach(([id]) => { SLOT[id] = [k + 1, t]; }));

/* ---------- nodes ---------- */
function PortRows({ ins, outs, hidden }) {
  const { showOrder } = useContext(Ctx);
  const f = ps => ps.filter(p => showOrder || p[3] !== 'order');
  ins = f(ins); outs = f(outs);
  const n = Math.max(ins.length, outs.length);
  if (!n && !hidden) return null;
  return (<div className="ports">{Array.from({ length: n }).map((_, i) => (<div className="prow" key={i}>
      <div className={'pin' + (ins[i] && HK.has(ins[i][0]) ? ' hk' : '')}>{ins[i] ? (<><Handle type="target" position="left" id={ins[i][0]} />{HK.has(ins[i][0]) ? (<i className="hki">⇅</i>) : null}<span>{ins[i][1]}</span><em>{String(ins[i][2]).toLowerCase() === String(ins[i][1]).toLowerCase() ? '' : ins[i][2]}</em></>) : null}</div>
      <div className={'pout' + (outs[i] && outs[i][0] === 'products' ? ' prod' : '') + (outs[i] && HK.has(outs[i][0]) ? ' hk' : '')}>{outs[i] ? (<><em>{String(outs[i][2]).toLowerCase() === String(outs[i][1]).toLowerCase() ? '' : outs[i][2]}</em><span>{outs[i][1]}</span><Handle type="source" position="right" id={outs[i][0]} /></>) : null}</div></div>))}
    {hidden ? (<div className="phid">+{hidden} optional input{hidden > 1 ? 's' : ''}, not wired</div>) : null}</div>);
}
function BoxFooter({ id }) {
  const { open, showRun, t } = useContext(Ctx);
  const s = sumOf(id);
  const live = showRun && !atEnd(t) ? (() => { const ss = stepsOf(id).filter(x => !isFile(x)).map(x => stepState(x, t)); const c = k => ss.filter(x => x === k).length; return [c('done') + c('skipped'), ss.length, c('running'), c('paused')]; })() : null;
  if (live) return (<div className="ft"><span className="run"><i className={'dot s-' + boxState(id, t)} />{live[0]} of {live[1]} done{live[2] ? ` · ${live[2]} running` : ''}{live[3] ? (<> · <b className="pz">{live[3]} paused</b></>) : ''}</span>
      <button type="button" className="open nodrag" onClick={e => { e.stopPropagation(); open(id); }}>Open</button></div>);
  return (<div className="ft">{showRun ? (<span className="run"><i className={'dot ' + (s.skipped ? 'warn' : 'ok')} />{s.n} done{s.skipped ? ` · ${s.skipped} skipped` : ''} · {fmtT(s.dur)}{s.calls ? ` · ${s.calls} calls` : ''}{s.rej ? ` · ${s.rej} rejected` : ''}</span>) : (<span />)}
      <button type="button" className="open nodrag" onClick={e => { e.stopPropagation(); open(id); }}>Open</button></div>);
}
function Provides({ id, max }) {
  const ps = PRODUCTS[id] || [];
  if (!ps.length) return (<div className="prov none"><span className="micro">Provides</span><p>Nothing for the report. Shares data with the other workstreams.</p></div>);
  return (<div className="prov"><span className="micro">Provides · {PRODUCTS[id + ':count']}</span><ul>{ps.slice(0, max).map(([pid, t, k, st]) => (<li key={pid} className={st}><i>{PIC[k]}</i><span>{t}</span></li>))}</ul>{ps.length > max ? (<p className="more">and {ps.length - max} more</p>) : null}</div>);
}
function BlockNode({ id, data }) {
  const b = BLOCKS[id], ps = PRODUCTS[id] || [];
  return (<div className="nb"><Mark id={id} at="badge" />
    <div className="k"><span className="micro">Block · {b.steps.length} steps</span>{b.reuse ? (<span className="reuse">Used 3×</span>) : null}<KbDot id={id} /></div>
    <div className="t"><Mark id={id} at="title" />{b.title}</div>
    <div className="w">{b.what}</div>
    {ps.length ? (<div className="provline"><i>¶</i>Provides {PRODUCTS[id + ':count']}</div>) : null}
    <PortRows ins={data.ins} outs={data.outs} />
    <BoxFooter id={id} />
  </div>);
}
function EdgePorts({ ports, side }) {
  const { showOrder } = useContext(Ctx);
  const ps = (ports || []).filter(p => showOrder || p[3] !== 'order');
  if (!ps.length) return null;
  return (<div className={'pedge ' + side}>{ps.map(p => (<span key={p[0]} className={'chip' + (p[3] === 'order' ? ' ord' : '')}><Handle type={side === 'top' ? 'target' : 'source'} position={side} id={p[0]} /><i>↓</i>{p[1]}</span>))}</div>);
}
function WorkstreamNode({ id, data }) {
  const c = WS[id];
  const nb = c.kids.filter(k => BLOCKS[k]).length;
  return (<div className="nb nc"><Mark id={id} at="badge" />
    <HandPort ports={data.top} side="top" />
    <div className="k"><span className="micro">Workstream · {c.kind}</span><span className="micro">{c.steps.filter(x => !isFile(x)).length} steps</span><KbDot id={id} /></div>
    <div className="t"><Mark id={id} at="title" />{c.title}</div>
    <div className="w">{c.what}</div>
    <Provides id={id} max={4} />
    <PortRows ins={data.ins} outs={data.outs} />
    <BoxFooter id={id} />
    <HandPort ports={data.bottom} side="bottom" />
  </div>);
}
function ReportNode() {
  const total = Object.keys(SLOT).length;
  return (<div className="nrep">
    <Handle type="target" position="left" id="products" />
    <div className="k"><span className="micro">Report template</span><span className="micro">{REPORT_OUTLINE.length} parts</span></div>
    <div className="t">Futurity Insight Report</div>
    <ol>{REPORT_OUTLINE.map(([t, items]) => (<li key={t}><span>{t}</span><em>{items.length ? items.length : 'built in'}</em></li>))}</ol>
    <div className="w">The template orders the sections. The workflow only makes them.</div>
  </div>);
}
function PrimNode({ id, data }) {
  const { showRun, t } = useContext(Ctx);
  const i = info(id), [kname, cat] = KIND[i.type];
  const shown = new Set(data.ins.map(p => p[0]));
  const hidden = (CATP[i.type] || []).filter(p => !/A/.test(p[2]) && !/O/.test(p[2]) && !shown.has(p[0])).length;
  const status = i.notRun || i.skipped ? 'idle' : i.declined ? 'warn' : 'ok';
  const runLine = i.notRun ? 'Did not run (no items)' : i.skipped ? 'Skipped' : [i.runs ? `ran ${i.runs}×` : null, i.calls ? `${i.calls} call${i.calls > 1 ? 's' : ''}` : null, (i.attempts || []).length ? `${i.attempts.length} rejected` : null, i.dur != null ? fmtT(i.dur) : null].filter(Boolean).join(' · ');
  return (<div className={'np c-' + cat + (i.declined || i.skipped ? ' declined' : '')}><Mark id={id} at="badge" />
    {data.params ? (<Handle type="target" position="top" id="__params" className="ph" />) : null}
    <div className="k"><span className="micro">{kname}</span>{cat === 'ai' ? (<span className="ai">AI</span>) : null}</div>
    <div className="t"><Mark id={id} at="title" />{i.title}</div>
    {KBW.has(id) ? (<div className="kbchip"><i />Files its pages and report in the knowledgebase</div>) : null}
    {isProduct(id) && SLOT[id] ? (<div className="provline" title={SLOT[id][1]}><i>¶</i>To the report · part {SLOT[id][0]}</div>) : null}
    <PortRows ins={data.ins} outs={data.outs} hidden={cat === 'plumb' ? 0 : hidden} />
    {showRun ? (atEnd(t) ? (<div className="run"><i className={'dot ' + status} />{i.declined ? 'Declined to write · ' : ''}{runLine}</div>) : (<div className="run"><i className={'dot s-' + stepState(id, t)} />{RUNW[stepState(id, t)]}</div>)) : null}
    {isReader(id) ? (<ReaderLine id={id} />) : null}
    <SteerLine id={id} />
  </div>);
}
const RUNW = { wait: 'Not started', running: 'Running', done: 'Done', failed: 'Failed, retried later', skipped: 'Skipped', part: 'Part done', paused: 'Paused' };
const Cyl = () => (<svg className="cyl" viewBox="0 0 16 18" aria-hidden="true"><ellipse cx="8" cy="3.5" rx="6.5" ry="2.5" /><path d="M1.5 3.5v11c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-11" /><path d="M1.5 9c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" /></svg>);
/* node state marks: a glyph before the title, or a badge on the corner */
const VIS = { wait: 'wait', running: 'run', part: 'run', paused: 'pause', done: 'done', failed: 'fail', skipped: 'skip' };
const SG = {
  wait: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke-dasharray="2.4 2.4"/></svg>',
  run: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" opacity=".25"/><path class="spin" d="M8 2a6 6 0 0 1 6 6"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2"/><path d="M6.4 5.6v4.8M9.6 5.6v4.8"/></svg>',
  done: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.6" fill="currentColor" stroke="none"/><path d="M5 8.3l2 2 4-4.4" stroke="var(--card)"/></svg>',
  fail: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4"/></svg>',
  skip: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2"/><path d="M4 12L12 4"/></svg>',
};
const SGB = { ...SG, done: '<svg viewBox="0 0 16 16"><path d="M3.8 8.4l2.6 2.6 5.8-6"/></svg>', pause: '<svg viewBox="0 0 16 16"><path d="M5.8 4.5v7M10.2 4.5v7"/></svg>', fail: '<svg viewBox="0 0 16 16"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>' };
const SLABEL = { wait: 'Not started', run: 'Running', pause: 'Paused', done: 'Done', fail: 'Failed', skip: 'Skipped' };
function Mark({ id, at }) {
  const { t, showRun, nodeLook } = useContext(Ctx);
  if (!showRun) return null;
  const s = VIS[nodeState(id, t)]; if (!s) return null;
  if (at === 'title' && nodeLook === 'glyph') return (<span className={'sg c-' + s} role="img" aria-label={SLABEL[s]} dangerouslySetInnerHTML={{ __html: SG[s] }} />);
  if (at === 'badge' && nodeLook === 'badge') return (<span className={'nbadge c-' + s} role="img" aria-label={SLABEL[s]}><span className="sg" dangerouslySetInnerHTML={{ __html: SGB[s] }} /></span>);
  return null;
}
const FST = {
  none: ['Files when its research finishes', ''],
  wait: ['Not filed', 'Its research is still running.'],
  retry: ['Filing · retrying', 'The research is running again after a failure.'],
  filed: ['Filed', 'Its pages and report are filed and searchable.'],
  failed: ['Failed, nothing filed', 'The research failed after its own retries, so there is nothing to file.'],
};
const Glyph = ({ st }) => st === 'filed' ? (<svg viewBox="0 0 24 24" className="gl-ok" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>)
  : st === 'failed' ? (<svg viewBox="0 0 24 24" className="gl-x" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>)
  : st === 'retry' ? (<span className="gl-drop"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v4h16v-4" /></svg><svg viewBox="0 0 24 24" className="drop" aria-hidden="true"><path d="M12 3v9M8.5 8.5L12 12l3.5-3.5" /></svg></span>)
  : (<svg viewBox="0 0 24 24" className="gl-wait" aria-hidden="true"><circle cx="12" cy="12" r="9" /></svg>);
function FileFace({ f, st, look, handles, onClick }) {
  const F = FILES[f], s = st || 'none';
  const hIn = handles ? (<Handle type="target" position="left" id="pages" />) : null;
  const hOut = handles ? (<Handle type="source" position="right" id="filed" />) : null;
  if (look === 'pill') return (<div className={'nfile pill f-' + s} onClick={onClick}>{hIn}
      <span className="fc">{s === 'filed' ? (<Glyph st="filed" />) : s === 'failed' ? (<b className="bang">!</b>) : (<Cyl />)}{s === 'retry' ? (<i className="spin" />) : null}</span>
      <span className="fx"><b>{F.title}</b><em>{s === 'none' ? 'File in knowledgebase' : FST[s][0]}</em></span>{hOut}</div>);
  return (<div className={'nfile glyph f-' + s} onClick={onClick}>
      <span className="fc">{hIn}<Glyph st={s} /><i className="kbm"><Cyl /></i>{s === 'retry' ? (<i className="try">2nd try</i>) : null}{hOut}</span>
      <b>{F.title}</b><em>{s === 'none' ? 'File in knowledgebase' : FST[s][0]}</em></div>);
}
function FileNode({ id }) { const { t, showRun, fileLook } = useContext(Ctx); return (<FileFace f={id} st={showRun ? fileState(id, t) : null} look={fileLook} handles={true} />); }
function KbDot({ id }) {
  const { t, showRun } = useContext(Ctx);
  const d = showRun ? dotState(id, t) : null;
  if (!d) return null;
  return (<i className={'kbdot d-' + d} title={'Knowledgebase: ' + DOTW[d].toLowerCase()} aria-label={'Knowledgebase: ' + DOTW[d]} />);
}
function ReaderLine({ id }) {
  const { t, showRun } = useContext(Ctx);
  const s = showRun ? stepState(id, t) : null;
  const w = showRun && SIM.without[id] && (s === 'running' || s === 'done');
  const text = !showRun ? 'Searches after: ' + needsText(id)
    : s === 'paused' ? 'Paused · needs the question research'
    : s === 'running' ? (w ? 'Searching without the question research' : 'Searching')
    : s === 'done' ? (w ? 'Searched without the question research' : 'Searched with everything it needs filed')
    : 'Waits for: ' + needsText(id);
  return (<div className={'rdr' + (s === 'paused' ? ' bad' : w ? ' warn' : '')}><Cyl />{text}</div>);
}
const IO_NAME = { in: 'Run inputs' };
function IoNode({ id, data }) {
  const name = IO_NAME[id] || (id === 'bin' ? (data.lk === 'ws' ? 'Workstream inputs' : 'Block inputs') : (data.lk === 'ws' ? 'Workstream outputs' : 'Block outputs'));
  return (<div className="nio"><span className="micro">{name}</span><PortRows ins={data.ins} outs={data.outs} /></div>);
}
function MiniNode({ id }) {
  const { showRun, t } = useContext(Ctx);
  const i = info(id), [kname, cat] = KIND[i.type];
  if (isFile(id)) { const st = showRun ? fileState(id, t) : 'none'; return (<div className={'nm c-kb f-' + st} title={i.title}><Handle type="target" position="left" id="i" /><Handle type="source" position="right" id="o" />
    <div className="mk"><span>File</span>{showRun ? (<em>{FST[st][0]}</em>) : null}</div><div className="mt">{FILES[id].title}</div></div>); }
  const st = i.notRun || i.skipped ? 'idle' : i.declined ? 'warn' : 'ok';
  return (<div className={'nm c-' + cat + (i.skipped || i.declined ? ' declined' : '') + (isProduct(id) ? ' isprod' : '')} title={i.title}>
    <Handle type="target" position="left" id="i" /><Handle type="source" position="right" id="o" />
    <div className="mk"><span>{kname}</span>{showRun ? (atEnd(t) ? (<em><i className={'dot ' + st} />{i.skipped ? 'skipped' : i.dur != null ? fmtT(i.dur) : ''}</em>) : (<em><i className={'dot s-' + stepState(id, t)} />{RUNW[stepState(id, t)]}</em>)) : null}</div>
    <div className="mt"><Mark id={id} at="title" />{i.title}</div><Mark id={id} at="badge" /></div>);
}
function LaneNode({ data }) {
  const c = data.ch === 'rep' ? { title: 'Report', steps: ['105', '106'] } : WS[data.ch], s = sumOf(data.ch);
  return (<div className="lane" style={{ width: data.w + 'px', height: data.h + 'px' }}><div className="lt"><b>{c.title}</b><span>{data.ch === 'rep' ? 'assemble and publish' : 'Workstream · ' + c.kind} · {c.steps.length} steps · {fmtT(s.dur)} working{s.calls ? ' · ' + s.calls + ' model calls' : ''}</span></div></div>);
}

/* ---------- panes and shared resources ---------- */
function IoTbNode({ id, data }) {
  const top = data.meta.side === 'top';
  const ps = top ? data.outs : data.ins;
  const chips = (<div className={'pedge ' + (top ? 'bottom' : 'top')}>{ps.map(p => (<span key={p[0]} className="chip"><Handle type={top ? 'source' : 'target'} position={top ? 'bottom' : 'top'} id={p[0]} /><i>↓</i>{p[1]}</span>))}</div>);
  return (<div className={'nio tb ' + data.meta.side}>{top ? null : chips}<span className="micro">{top ? 'Late inputs' : 'Early outputs'}</span><p>{top ? 'Arrive after the work here has started' : 'Released while the work here goes on'}</p>{top ? chips : null}</div>);
}
const SIDEW = { out: 'output', early: 'early output', in: 'input', late: 'late input' };
function HandPort({ ports, side }) {
  if (!ports || !ports.length) return null;
  return (<div className={'pedge ' + side}><span className="chip hand"><Handle type="target" position={side} id={'h-t-' + side} /><Handle type="source" position={side} id={'h-s-' + side} />Handoff</span></div>);
}
const HArrow = () => (<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v9M4.5 8.5L8 12l3.5-3.5" /></svg>);
function HandNode({ id, data }) {
  const { sel, sides, goSide } = useContext(Ctx);
  const m = data.meta, top = m.side === 'top';
  const many = !top && sel === id && sides ? sides(id) : [];
  const zoom = useStore(st => st.transform[2]);
  const menu = many.length > 1 ? (<div className="hmenu nodrag nopan nowheel" style={{ transform: 'translateX(-50%) scale(' + (1 / zoom) + ')' }} role="menu" aria-label="Open the other side" onClick={e => e.stopPropagation()}>
      <span className="micro">Goes to {many.length} places</span>
      {many.map(o => (<button type="button" role="menuitem" key={o.path.join('/')} onClick={e => { e.stopPropagation(); goSide(o); }}><span>{o.where}</span><i>→</i></button>))}
    </div>) : null;
  const lbl = (<div className="hl"><b>{m.what}</b><em>{top ? 'from ' + m.from : 'to ' + (m.to || []).join(', ')}</em></div>);
  return (<div className={'nhand ' + m.side}>{top ? lbl : null}
    <span className="hc">{top ? (<Handle type="source" position="bottom" id={m.key} />) : (<Handle type="target" position="top" id={m.key} />)}<HArrow /></span>
    {top ? null : lbl}{menu}</div>);
}
function HandView({ sel, level, reveal }) {
  const { sides, goSide } = useContext(Ctx);
  const n = (LEVELS[level].nodes || []).find(x => x[0] === sel); if (!n) return null;
  const other = sides ? sides(sel) : [];
  const m = n[6], top = m.side === 'top';
  const src = (m.key.match(/^k(kb_[a-z]+|\d+)_/) || [])[1];
  const uses = LEVELS[level].edges.filter(e => top ? e[0] === sel : e[2] === sel).map(e => top ? e[2] : e[0]);
  const nm = id => (WS[id] || BLOCKS[id] || {}).title || nameOf(id);
  return (<><div className="ihd"><span className="micro">{top ? 'Late input' : 'Early output'} · {m.type}</span><h3>{m.what}</h3>
      <p>{top ? `From ${m.from}. It arrives after work in here has started: what it feeds already has work before it, so only that part waits for it.` : `Goes to ${(m.to || []).join(', ')}. It is released while work in here goes on: more work follows the step that makes it.`}</p></div>
    <div className="blk"><span className="micro">{top ? 'Made by' : 'Made in here by'}</span><div className="from">{src ? (<span><button type="button" className="olink" onClick={() => reveal(src)}><span>{nameOf(src)}</span><em className="src">{placeOf(src)}</em></button></span>) : null}</div></div>
    <div className="blk"><span className="micro">{top ? 'Feeds, in here' : 'Leaves from'}</span><div className="from">{[...new Set(uses)].map(id => (<span key={id}>{nm(id)}</span>))}</div></div>
    <div className="blk"><span className="micro">Other side</span><div className="from">{other.map(o => (<span key={o.where}><button type="button" className="olink" onClick={() => goSide(o)}><span>Open {o.where} →</span></button></span>))}</div></div>
    <p className="mut">{other.length > 1 ? 'Click the node to pick which one to open.' : 'Click the node to open the other side.'} On the workstream card this is part of the one Handoff port.</p></>);
}
function XWireView({ k, reveal }) {
  const v = XW[k]; if (!v) return null;
  const A = WS[v.a].title, B = WS[v.b].title;
  const groups = groupBy(v.items, i => i.from + ':' + i.port);
  if (v.hand) return (<><div className="ihd"><span className="micro">Handoff</span><h3>{A} → {B}</h3>
      <p>Work that passes from {A} to {B} while both are running. Open either workstream to see where each item leaves and arrives.</p></div>
    <div className="blk"><span className="micro">What passes</span><ul className="plinks">{Object.entries(groups).map(([g, is]) => (<li key={g}>
      <button type="button" onClick={() => reveal(is[0].from)}><i>→</i><span><b>{is[0].what}</b> <em className="xch">{is[0].type}</em><br /><span className="mut">to {[...new Set(is.map(i => nameOf(i.to)))].join(', ')}</span></span></button></li>))}</ul></div></>);
  return (<><div className="ihd"><span className="micro">Wire · {SIDEW[v.sa]} → {SIDEW[v.sb]}</span><h3>{A} → {B}</h3>
      <p>{v.sa === 'out' ? `Made by the last work in ${A}.` : `Released by ${A} while it keeps working.`} {v.sb === 'in' ? `${B} needs it at its start: the first ${B} work that uses it waits for it.` : `${B} starts without it. Only the later part that uses it waits.`}</p></div>
    <div className="blk"><span className="micro">What passes</span><ul className="plinks">{Object.entries(groups).map(([g, is]) => (<li key={g}>
      <button type="button" onClick={() => reveal(is[0].from)}><i>→</i><span><b>{is[0].what}</b> <em className="xch">{is[0].type}</em><br /><span className="mut">to {[...new Set(is.map(i => nameOf(i.to)))].join(', ')}</span></span></button></li>))}</ul></div>
    <div className="blk"><span className="micro">Why this side</span><p className="mut">{v.sb === 'in' ? 'It feeds a block with nothing upstream inside ' + B + '.' : 'Inside ' + B + ', what it feeds already has work before it.'} {v.sa === 'out' ? 'Nothing else in ' + A + ' uses it apart from writers.' : 'Inside ' + A + ', more work follows the step that makes it.'} The same rule decides the panes at every level.</p></div></>);
}
const nodeTypes = { iotb: IoTbNode, hand: HandNode, file: FileNode, block: BlockNode, chapter: WorkstreamNode, report: ReportNode, prim: PrimNode, io: IoNode, mini: MiniNode, lane: LaneNode };

/* ---------- wires ---------- */
const nameOf = id => id === '1' ? 'Run inputs' : (info(id) || {}).title || id;
const realIn = id => LINKS_ALL.filter(l => l[2] === id).map(l => ({ port: l[3], from: nameOf(l[0]) + ' · ' + l[1], src: l[0], style: l[4] }));
const realOut = id => LINKS_ALL.filter(l => l[0] === id).map(l => ({ port: l[1], to: nameOf(l[2]) + ' · ' + l[3], dst: l[2], style: l[4] }));
const SUBIN = { T203: [['data', 'Block input · data']], T201: [['hard_data', 'Block input · data'], ['facts', 'Leaf facts · facts']], T202: [['insights', 'Leaf analyst · insight'], ['heading', 'Block input · title'], ['facts', 'Leaf facts · facts']],
  '203': [['data', 'Block input · data']], '201': [['hard_data', 'Block input · data'], ['facts', 'Leaf facts · facts']], '202': [['insights', 'Leaf analyst · insight'], ['heading', 'Block input · title'], ['facts', 'Leaf facts · facts']] };
const wiresIn = id => SUBIN[id] ? SUBIN[id].map(([p, f]) => ({ port: p, from: f, style: '' })) : realIn(id);
const wiresOut = id => SUBIN[id] ? [] : realOut(id);
const boxIn = id => { const s = new Set(stepsOf(id)); return LINKS_ALL.filter(l => s.has(l[2]) && !s.has(l[0])); };
const boxOut = id => { const s = new Set(stepsOf(id)); return LINKS_ALL.filter(l => s.has(l[0]) && !s.has(l[2])); };
const groupBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});

/* ---------- inspector ---------- */
function Bar({ parts }) {
  const tot = parts.reduce((a, p) => a + p[1], 0);
  return (<><div className="abar">{parts.map((p, i) => (<i key={i} className={'s' + p[2]} style={{ flex: p[1] + ' 1 0' }} title={p[0] + ': ' + p[1].toLocaleString() + ' characters'} />))}</div>
    <div className="acap"><span>{parts.length} parts</span><span>{tot.toLocaleString()} characters</span></div></>);
}
function Parts({ parts }) {
  const [open, setOpen] = useState(null);
  const SRC = { 1: 'Your setting', 2: 'From the wiring', 3: 'Engine' };
  return (<ul className="plist">{parts.map((p, i) => (<li key={i} className={open === i ? 'on' : ''}>
    <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}><i className={'s' + p[2]} /><b>{p[0]}</b><span>{SRC[p[2]]}</span><em>{p[1].toLocaleString()}</em></button>
    {open === i ? (<pre>{p[3]}</pre>) : null}</li>))}</ul>);
}
function Contract({ id }) {
  const { showOrder } = useContext(Ctx);
  const i = info(id), ins = wiresIn(id), outs = wiresOut(id).filter(o => showOrder || o.style !== 'order');
  const cat = (CATP[i.type] || []).filter(p => showOrder || !/O/.test(p[2]));
  const wired = cat.filter(p => ins.some(w => w.port === p[0]) || /A/.test(p[2]) || /R/.test(p[2]));
  const rest = cat.filter(p => !wired.includes(p));
  const prm = (i.settings || {})['Run inputs in settings'];
  return (<>
    <div className="blk"><span className="micro">Inputs</span>
      {prm ? (<div className="pr"><div className="pn"><b>Run inputs, through settings</b><span className="tag warn">not a wire</span></div><p>Reads {prm} from {'{'}{'{'}params.…{'}'}{'}'} placeholders in its settings. On the board this is drawn as a dashed wire.</p></div>) : null}
      {wired.map(p => { const w = ins.filter(x => x.port === p[0]); return (<div className="pr" key={p[0]}><div className="pn"><b>{p[0]}</b><em>{p[1]}{/x(\d+)/.test(p[2]) ? ' · up to ' + p[2].match(/x(\d+)/)[1] : ''}</em>{/R/.test(p[2]) ? (<span className="tag req">Required</span>) : null}{/A/.test(p[2]) ? (<span className="tag">auto</span>) : null}</div>
        <p>{flagsText(p[2])}</p>{w.length ? (<div className="from">{w.map((x, k) => (<span key={k}>← {x.from}{x.style === 'order' ? ' (write order)' : x.style === 'wait' ? ' (waits for it)' : ''}{x.src && placeOf(x.src) !== placeOf(id) ? (<em className="xch">{placeOf(x.src)}</em>) : null}</span>))}</div>) : !/A/.test(p[2]) ? (<div className="from miss">Not wired</div>) : null}</div>); })}
      {rest.length ? (<details className="opt"><summary>{rest.length} optional input{rest.length > 1 ? 's' : ''}, not wired</summary>{rest.map(p => (<div className="pr" key={p[0]}><div className="pn"><b>{p[0]}</b><em>{p[1]}</em></div><p>{flagsText(p[2])}</p></div>))}</details>) : null}
      {!cat.length ? (<p className="mut">No inputs.</p>) : null}
    </div>
    <div className="blk"><span className="micro">Outputs</span><div className="from">
      {isProduct(id) ? (<span className="prodline">{i.type === 'flow/foreach' ? 'results' : i.type.startsWith('viz/') ? 'figure' : 'section'} → the report{SLOT[id] ? (<>, under "{SLOT[id][1]}"</>) : ''}</span>) : null}
      {outs.map((o, k) => (<span key={k}>{o.port} → {o.to}{o.style === 'order' ? ' (write order)' : ''}{o.dst && placeOf(o.dst) !== placeOf(id) ? (<em className="xch">{placeOf(o.dst)}</em>) : null}</span>))}
      {!outs.length && !isProduct(id) ? (<span className="mut">{id === '106' ? 'The finished report.' : 'Goes to the block output.'}</span>) : null}</div></div>
    <div className="blk"><span className="micro">Settings</span>{Object.keys(i.settings || {}).filter(k => k !== 'Run inputs in settings').length ? (<dl className="set">{Object.entries(i.settings).filter(([k]) => k !== 'Run inputs in settings').map(([k, v]) => (<><dt key={'k' + k}>{k}</dt><dd key={'v' + k}>{v}</dd></>))}</dl>) : (<p className="mut">None shown here.</p>)}</div></>);
}
const PLAIN = { 'flow/gate': 'Tests its condition and sends the value down "pass" or "fail". The side not taken is skipped, with a recorded reason.', 'flow/pick': 'Takes one field out of a value. No logic beyond the path.',
  'data/mint-facts': 'Reads values from the data by path and turns each into a fact token writers can cite. The only way a number reaches the report.', 'viz/table': 'Builds a table only from facts and recorded data. No model involved.',
  'viz/chart': 'Draws a chart in code from recorded data. No model involved.', 'flow/foreach': 'Runs a block once per item in its list.', 'flow/join': 'Waits for every wired input, then passes them on together.',
  'data/verify-rows': 'Checks each row against the page it cites. No network calls.', 'data/script': 'Python, run in a sandbox. The engine records its input and output, so every number it produces can be traced.',
  'report/assemble': 'Substitutes fact tokens, removes untraceable sentences, runs the citation gate and lays out the report from the template.',
  'report/publish': 'Renders the report and builds the audit bundle.', 'kb/select': 'Makes the run\'s knowledgebase: the lab\'s own material, then everything this run files. Earlier runs are never in it. The first gate takes it from here.',
  'research/deep': 'Runs the deep researcher with the run\'s model. Its prompts live inside the researcher, so the engine does not record them. It does record every page read: each becomes evidence and a knowledgebase document.' };
function Inside({ id }) {
  const i = info(id);
  if (i.rich && i.parts) return (<><p>The prompt this step sent, part by part. {i.type === 'agent/debate' ? 'The red team runs two prompts (critic, then reviser); this is the critic\'s.' : ''} Click a part to read it.</p>
    <div className="legend"><span><i className="s1" />Your settings</span><span><i className="s2" />From the wiring</span><span><i className="s3" />Engine</span></div>
    <Bar parts={i.parts} /><Parts parts={i.parts} />
    <p className="mut">Then the model answers through a submit tool, and the engine checks the answer. See This run.</p></>);
  if (i.notRun) return (<p>This step is part of a block that ran zero times in this run, so there is nothing recorded.</p>);
  if (isAI(id) && i.type !== 'research/deep') return (<><p>{i.sys ? (<>Its longest prompt was <b>{i.sys.toLocaleString()} characters</b>.</>) : null} The prompt has the same anatomy as every AI step: role and task from its settings, the fact catalog and hard data from its wires, then the five engine rules and an output contract.</p>
    {i.sys ? (<><div className="sysbar"><i style={{ width: Math.min(100, i.sys / 650) + '%' }} /></div><div className="acap"><span>0</span><span>the longest prompt in this run</span></div></>) : null}
    <p className="mut">This prototype breaks prompts into parts for the Engineering steps only. The same capture works for every AI step.</p></>);
  if (i.type === 'data/script' && i.inside) return (<><p>{PLAIN['data/script']}</p><pre className="code">{i.inside}</pre></>);
  if (i.type === 'tool/futurity') return (<p>{i.inside || 'Calls FAST: ' + ((i.settings || {}).Tool || 'a FAST tool') + '. No prompt.'}</p>);
  return (<p>{i.inside || PLAIN[i.type] || ''}</p>);
}
function ThisRun({ id }) {
  const i = info(id);
  if (i.notRun) return (<div className="warnnote">Did not run. "Per-taxonomy sections" received an empty list, so this block ran zero times.</div>);
  if (i.skipped) return (<div className="warnnote">{i.note}</div>);
  const att = i.attempts || [];
  return (<>
    <div className="facts">{i.dur != null ? (<div><b>{fmtT(i.dur)}</b>working time</div>) : null}{i.start != null ? (<div><b>{fmtT(i.start) || '0 s'}</b>started after</div>) : null}{i.calls ? (<div><b>{i.calls}</b>model calls</div>) : null}{i.tok ? (<div><b>{((i.tok + (i.ctok || 0)) / 1000).toFixed(1)}k</b>tokens</div>) : null}</div>
    {i.note ? (<div className="warnnote">{i.note}</div>) : null}
    {i.runs ? (<div className="oknote">Ran {i.runs} times, once per topic. The numbers are totals.</div>) : null}
    {isAI(id) && i.type !== 'research/deep' ? (<div className="blk"><span className="micro">Attempts</span><ol className="att">
      {att.map((a, k) => (<li key={k} className="rej"><b>{i.runs ? 'Rejected' : 'Attempt ' + (k + 1) + ' rejected'}</b><span className="tag">{a.check || 'CHECK'}</span>{a.ex ? (<p>{a.ex}</p>) : null}</li>))}
      <li className={i.declined ? 'dec' : 'acc'}><b>{i.runs ? 'All accepted in the end' : 'Attempt ' + (att.length + 1) + (i.declined ? ' accepted as a refusal' : ' accepted')}</b></li></ol></div>) : null}
    {i.out ? (<div className="blk"><span className="micro">Output</span><pre className="outp">{i.out}</pre></div>) : null}</>);
}
function ProvidesList({ id, reveal }) {
  const ps = PRODUCTS[id] || [];
  if (!ps.length) return (<div className="blk"><span className="micro">Provides</span><p className="mut">Nothing for the report. Everything it makes is shared with other workstreams.</p></div>);
  return (<div className="blk"><span className="micro">Provides · {PRODUCTS[id + ':count']}</span><ul className="plinks">{ps.map(([pid, t, k, st]) => (<li key={pid} className={st}>
    <button type="button" onClick={() => reveal(pid)}><i>{PIC[k]}</i><span>{t}</span>{st !== 'ok' ? (<em className="bad">{STW[st]}</em>) : SLOT[pid] ? (<em title={SLOT[pid][1]}>part {SLOT[pid][0]}</em>) : null}</button></li>))}</ul></div>);
}
function BoxView({ id, open, reveal }) {
  const { showOrder } = useContext(Ctx);
  const b = boxOf(id), s = sumOf(id), isW = !!WS[id];
  const ins = groupBy(boxIn(id).filter(l => l[0] !== '2' && (showOrder || l[4] !== 'order')), l => l[0] + ':' + l[1]);
  const outs = groupBy(boxOut(id).filter(l => showOrder || l[4] !== 'order'), l => l[0] + ':' + l[1]);
  const prm = stepsOf(id).filter(x => (info(x).settings || {})['Run inputs in settings']);
  const kids = isW ? WS[id].kids : b.steps;
  return (<><div className="ihd"><span className="micro">{isW ? 'Workstream · ' + b.kind : 'Block'} · {b.steps.length} steps</span><h3>{b.title}</h3><p>{b.what}</p>
      {b.reuse ? (<div className="oknote">{b.reuse} One definition, three copies. Change it once and all three change.</div>) : null}
      <button type="button" className="btn pri" onClick={() => open(id)}>Open {isW ? 'workstream' : 'block'}</button></div>
    {id === RR.block ? (<RerunPanel />) : null}
    <ProvidesList id={id} reveal={reveal} />
    <div className="blk"><span className="micro">Takes</span>{prm.length ? (<div className="from"><span>← Run inputs (through settings)</span></div>) : null}
      {Object.entries(ins).length ? (<div className="from">{Object.entries(ins).map(([k, ls]) => (<span key={k}>← {nameOf(ls[0][0])}{ls.every(l => l[4] === 'order') ? ' (write order)' : ls.some(l => l[4] === 'wait') ? ' (waits for it)' : ''} <em className="xch">{placeOf(ls[0][0])}</em></span>))}</div>) : !prm.length ? (<p className="mut">Nothing from outside.</p>) : null}</div>
    <div className="blk"><span className="micro">Shares</span>{Object.entries(outs).length ? (<div className="from">{Object.entries(outs).slice(0, 8).map(([k, ls]) => (<span key={k}>{nameOf(ls[0][0])} → {[...new Set(ls.map(l => nameOf(l[2])))].slice(0, 3).join(', ')}{new Set(ls.map(l => l[2])).size > 3 ? ` +${new Set(ls.map(l => l[2])).size - 3}` : ''}</span>))}{Object.entries(outs).length > 8 ? (<span className="mut">and {Object.entries(outs).length - 8} more</span>) : null}</div>) : (<p className="mut">Nothing. Its work only reaches the report.</p>)}</div>
    <div className="blk"><span className="micro">This run</span><div className="facts"><div><b>{s.n}</b>steps done</div><div><b>{fmtT(s.dur)}</b>working time</div><div><b>{s.calls}</b>model calls</div><div><b>{s.rej}</b>rejected answers</div></div>
      {s.skipped ? (<div className="warnnote">{s.skipped} steps skipped: a gate found nothing to pass on.</div>) : null}
      {s.notes.slice(0, isW ? 3 : 6).map(([nid, note]) => (<div className="warnnote" key={nid}><b>{info(nid).title}:</b> {note || 'Declined to write.'}</div>))}</div>
    <div className="blk"><span className="micro">Inside</span><ul className="steps">{kids.map(k => BLOCKS[k] ? (<li key={k}><span className="kd c-ai">Block</span>{BLOCKS[k].title} <em className="mut">· {BLOCKS[k].steps.length} steps</em></li>) : (() => { const [kk, c] = kindOf(k); return (<li key={k}><span className={'kd c-' + c}>{kk}</span>{info(k).title}</li>); })())}</ul></div></>);
}
function ReportView({ reveal }) {
  const st = id => { const i = info(id); if (!i) return 'ok'; if (id === '21') return 'empty'; if (i.skipped) return 'skipped'; if (i.declined) return 'declined'; return 'ok'; };
  return (<><div className="ihd"><span className="micro">Report template</span><h3>Futurity Insight Report</h3>
      <p>The report's own outline, in reading order. Each entry names the workstream that makes it. Click one to find the step.</p>
      <p className="mut">The workflow only makes sections and figures. Where they go is decided here, by the template. An editor for it comes later.</p></div>
    <div className="blk"><span className="micro">Outline</span><ol className="outline big">{REPORT_OUTLINE.map(([t, items]) => (<li key={t}><span>{t}</span>{items.length ? (<ol>{items.map(([nid, tt]) => { const s = st(nid); return (<li key={nid} className={s}>
        <button type="button" className="olink" onClick={() => reveal(nid)}><span>{tt}</span><em className="src">{placeOf(nid)}</em>{s !== 'ok' ? (<em>{STW[s]}</em>) : null}</button></li>); })}</ol>) : (<em className="mut0"> built by Assemble</em>)}</li>))}</ol></div>
    <div className="blk"><span className="micro">Steps</span><div className="from"><span>Assemble report · {fmtT(info('105').dur)}</span><span>Publish report · {fmtT(info('106').dur)}</span></div>
      <p className="mut">In the engine today, sections reach Assemble through seven "section group" steps. This view drops them: Assemble can collect every section by itself, the way every AI step gets the knowledgebase.</p></div></>);
}
const HOW = (<ul className="how"><li><b>Workstreams and blocks</b> have a stacked edge and an Open button. Double-click works too.</li><li><b>Provides</b> lists the sections and figures that go to the report. They need no wires: the report template places them.</li><li><b>AI steps</b> carry a black AI tag. Select one to read its prompt and every answer the engine rejected.</li><li><b>Dashed wires</b> are run inputs read through settings text.</li></ul>);
function Empty({ level }) {
  const { showOrder } = useContext(Ctx);
  if (level === 'report') return (<div className="ins-empty"><span className="micro">How to read this</span><h3>Insight with Deep Search</h3>
    <p>The whole pipeline from a made-up run, 70 steps, in three layers: <b>workstreams</b>, the <b>blocks</b> inside them, and the engine <b>steps</b> inside those.</p>
    <p>A workstream is a body of work with its own inputs. Groundwork gets the lab and researches the brief's question. Engineering, Science and Business are analyses, each with its own data, facts and analysts. Synthesis works across them.</p>
    <div className="sides"><span className="micro">Where the wires go</span><ul className="how"><li><b>Left: inputs.</b> Needed at the start: they feed work with nothing before it inside.</li><li><b>Right: outputs.</b> Made by the last work inside. Blue is what goes to the report.</li><li><b>Top and bottom: handoffs.</b> Work that passes between workstreams while both are running. Each wire leaves from the side that faces the other card. Open a workstream to see which items arrive late and which leave early.</li><li>A step starts as soon as its own inputs are ready, so a workstream is running as soon as any step inside it is. The same rule sorts the panes inside every workstream and block.</li></ul></div>
    <div className="sides"><span className="micro">Knowledgebase filings</span><p>Each research job's pages and report go to a file node. A step that searches takes one wire per filing it needs and waits for them, like any input. The dot on each card says how its filings stand: gray, nothing filed yet; amber, some; green, all; red, one failed.</p><p>What happens when one fails is set at launch, under Run settings. The report and the knowledgebase have their own tabs, where you can watch them fill as the run plays.</p></div>{HOW}
    {showOrder ? (<div className="warnnote"><b>Write order is on.</b> The dotted wires show each of the 21 writers waiting for the one before it, across workstreams. Writing took 29 of the run's 38 minutes, all in single file.</div>) : (<p className="mut">The {RUN.writers} writers write one at a time, in a fixed order, so each one sees the report so far. Writing took {RUN.writeMin} of the run's {RUN.workMin} minutes.</p>)}
    <p className="mut">Workstream and block boundaries are a proposal. Every step, wire, check and number comes from a made-up run on small modular reactors.</p></div>);
  if (level === 'all') return (<div className="ins-empty"><span className="micro">How to read this</span><h3>Every step</h3>
    <p>All 70 steps and the 4 knowledgebase file nodes on one board, in workstream lanes. Left to right is dependency order: a step sits to the right of everything it reads.</p>
    <div className="legend big"><span><i className="lg ai" />AI step</span><span><i className="lg code" />Code, data, output</span><span><i className="lg plumb" />Plumbing</span><span><i className="lg prod" />Goes to the report</span><span><i className="lg skip" />Skipped</span><span><i className="lg gate" />File in knowledgebase</span></div>
    <p>Select a step to see its contract and run, and to jump to the block it belongs to. Select a lane to see its workstream.</p>
    {showOrder ? (<p><span className="chainkey" />The orange dotted wire is the write order: 21 writers, one after another, across four lanes.</p>) : null}</div>);
  const isW = !!WS[level];
  return (<div className="ins-empty"><span className="micro">How to read this</span><h3>{LEVELS[level].title}</h3>
    <p>{isW ? WS[level].what + ' Inputs come in on the left and outputs leave on the right. Each late input is a small node along the top, near what it feeds. Each early output is a small node along the bottom, near what makes it.' : level.startsWith('sg_') ? 'The block a For each step runs once per item. Its inputs are one item, its title and the data.' : 'The inside of a block. On the left are its inputs, on the right its outputs. Every step in between is an engine primitive. Late inputs come in from the top and early outputs leave at the bottom, decided again at this level.'}</p>{HOW}</div>);
}
function FailActions({ compact }) {
  const { t, pol, choose } = useContext(Ctx);
  const q = SIM.q;
  if (!(pol.policy === 'pause' && !actNow(pol, t) && t >= q.failAt && t < q.resolve)) return null;
  return (<div className={'factions' + (compact ? ' compact' : '')}>
    <button type="button" className="btn sec" onClick={() => choose('continue')}>Go on without it</button>
    <button type="button" className="btn pri" onClick={() => choose('retry')}>Retry research</button></div>);
}
function FileView({ f, reveal }) {
  const { t, showRun, fileLook } = useContext(Ctx);
  const F = FILES[f], st = showRun ? fileState(f, t) : 'none', r = F.research, q = SIM.q;
  const without = F.readers.filter(x => SIM.without[x] && f === 'kb_q');
  return (<><div className="ihd"><span className="micro">File in knowledgebase · {WS[F.ws].title}</span><h3>{F.title}</h3>
      <p>Files the pages and report of “{nameOf(r)}”. A step that searches takes one wire per filing it needs and waits for all of them, like any other input.</p></div>
    <div className="gview"><FileFace f={f} st={st} look={fileLook} handles={false} /></div>
    {f === 'kb_q' ? (<FailActions />) : null}
    <div className="blk"><span className="micro">States</span><ul className="gstates">{['wait', 'retry', 'filed', 'failed'].map(k => (<li key={k} className={'f-' + k + (st === k ? ' on' : '')}><i /><b>{FST[k][0]}</b><span>{FST[k][1]}</span></li>))}</ul></div>
    <div className="blk"><span className="micro">Searched by</span><div className="from">{F.readers.map(x => { const s = showRun ? stepState(x, t) : ''; return (<span key={x}><button type="button" className="olink" onClick={() => reveal(x)}><span>→ {nameOf(x)}</span><em className="src">{WS[wsOf(x)].title}{s ? ' · ' + (s === 'paused' ? 'paused' : s === 'done' ? (SIM.without[x] && f === 'kb_q' ? 'ran without it' : 'done') : RUNW[s].toLowerCase()) : ''}</em></button></span>); })}</div></div>
    <div className="blk"><span className="micro">In this replay</span>
      {f === 'kb_q' ? (<><p>Try 1 crashed while reading a PDF, {fmtT(q.failAt)} in. {q.byRetry ? `You chose Retry ${fmtClock(q.run2[0])} in. It filed ${fmtClock(q.filedAt)} in.` : `Nobody retried it, so it never filed.`}</p>
        <p>{without.length ? `${without.length} of ${F.readers.length} searchers ran without it. Their sections are flagged in the report.` : `Every searcher waited for it.`}</p></>)
      : (<p>Filed {fmtClock(SIM.fin[r])} in, when its research finished. This run does not record how long the filing itself took: in the engine it is the last part of the research step.</p>)}</div></>);
}
function Inspector({ sel, level, open, reveal }) {
  const [tab, setTab] = useState('contract');
  useEffect(() => setTab(sel && info(sel) && info(sel).rich && info(sel).parts ? 'inside' : sel && isAI(sel) ? 'run' : 'contract'), [sel]);
  if (!sel) return (<Empty level={level} />);
  if (sel === 'report' || sel === 'lane:rep') return (<ReportView reveal={reveal} />);
  if (sel.startsWith('edge:')) return (<XWireView k={sel.slice(5)} reveal={reveal} />);
  if (isFile(sel)) return (<FileView f={sel} reveal={reveal} />);
  if (/^(lt|eo):/.test(sel)) return (<HandView sel={sel} level={level} reveal={reveal} />);
  if (sel.startsWith('lane:')) return (<BoxView id={sel.slice(5)} open={open} reveal={reveal} />);
  if (isBox(sel)) return (<BoxView id={sel} open={open} reveal={reveal} />);
  if (['in', 'bin', 'bout', 'btop', 'bbot'].includes(sel)) {
    if (sel === 'in') return (<div className="ihd"><span className="micro">Pipeline input</span><h3>Run inputs</h3><p>What the person gave at launch. In this run: lab smr, years 2016 to 2026, up to 200 papers. The brief asked: “Could small modular reactors be powering data centres by 2035, and who would build them?” Company was empty.</p><p className="mut">Steps read these through {'{'}{'{'}params.…{'}'}{'}'} text in their settings, so the engine has no wire for them. The dashed wires show where they go.</p></div>);
    const L = LEVELS[level], n = L.nodes.find(x => x[0] === sel);
    const isIn = sel === 'bin' || sel === 'btop';
    const ports = isIn ? n[5] : n[4];
    const w = WS[level] ? 'workstream' : 'block';
    const T = { bin: ['Inputs', 'Needed at the start: each feeds work with nothing before it in here.'], btop: ['Late inputs', 'Arrive after work in here has started: each feeds work that already has something before it.'], bout: ['Outputs', 'Made by the last work in here. The last row is what goes to the report.'], bbot: ['Early outputs', 'Released while work in here goes on: more work follows the step that makes each one.'] }[sel];
    return (<><div className="ihd"><span className="micro">{w} pane</span><h3>{T[0]}</h3><p>{T[1]}</p></div>
      <div className="blk">{ports.map(p => { const src = (p[0].match(/^k(kb_[a-z]+|\d+)_/) || [])[1]; return (<div className="pr" key={p[0]}><div className="pn"><b>{p[1]}</b><em>{p[2]}</em>{p[3] === 'order' ? (<span className="tag">write order</span>) : null}</div>{src ? (<p>{isIn ? 'From' : 'Made by'} {placeOf(src) || 'Run inputs'} · {KIND[info(src).type][0]}</p>) : null}</div>); })}</div>
      {sel === 'bout' && PRODUCTS[level] ? (<ProvidesList id={level} reveal={reveal} />) : null}</>);
  }
  const i = info(sel); if (!i) return null;
  const [kname, cat] = KIND[i.type];
  const tgt = openTarget(sel);
  const where = pathTo(sel).slice(1);
  return (<><div className="ihd"><span className="micro">{kname} · <code>{i.type}</code></span><h3>{i.title}</h3>{cat === 'ai' ? (<span className="ai big">AI</span>) : null}
      {where.length ? (<p className="mut">{where.map(w => (WS[w] || BLOCKS[w]).title).join(' › ')}</p>) : null}
      <div className="btns">{tgt && tgt.startsWith('sg_') ? (<button type="button" className="btn sec" onClick={() => open(tgt)}>Open the repeated block</button>) : null}
      {level === 'all' && where.length ? (<button type="button" className="btn sec" onClick={() => reveal(sel)}>Show in its {where.length > 1 ? 'block' : 'workstream'}</button>) : null}</div></div>
    <SteerStep id={sel} />
    <div className="tabs" role="tablist">{[['contract', 'Contract'], ['inside', 'Inside'], ['run', 'This run']].map(([k, l]) => (<button type="button" role="tab" aria-selected={tab === k} key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>))}</div>
    {tab === 'contract' ? (<Contract id={sel} />) : tab === 'inside' ? (<Inside id={sel} />) : (<ThisRun id={sel} />)}</>);
}

/* ---------- board ---------- */
// Room at the top of the board for the level's title and the up button (BoardNav).
const FIT_PAD = { top: '76px', right: '24px', bottom: '24px', left: '24px' };
const levelKind = id => WS[id] ? 'Workstream · ' + WS[id].kind : BLOCKS[id] ? 'Block · ' + BLOCKS[id].steps.length + ' steps' : id === 'all' ? 'Every step' : 'Pipeline · ' + Object.keys(WS).length + ' workstreams';
const upName = st => st[st.length - 2] === 'report' ? 'All workstreams' : crumbTitle(st[st.length - 2]);
function BoardNav({ stack, setStack, setSel }) {
  const here = stack[stack.length - 1];
  return (<div className="bnav">
    <div className="bnav-title"><span className="micro">{levelKind(here)}</span><h2>{here === 'all' ? 'Every step' : crumbTitle(here)}</h2></div>
    {stack.length > 1 ? (<div className="bnav-up"><button type="button" className="upbtn" onClick={() => { setStack(stack.slice(0, -1)); setSel(null); }} aria-label={'Up to ' + upName(stack)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3.5M4 7.5L8 3.5l4 4" /></svg><span>{upName(stack)}</span></button></div>) : null}
  </div>);
}
const crumbTitle = id => id === 'report' ? 'Insight with Deep Search' : id === 'all' ? 'Every step' : (WS[id] || BLOCKS[id] || LEVELS[id]).title;
function Board({ stack, setStack, sel, setSel, showRun, setShowRun, t, pol, act, fileLook, setFileLook, nodeLook, setNodeLook }) {
  const outerCtx = useContext(Ctx);
  const rf = useReactFlow();
  const showOrder = false; // write-order wires are not shown in the demo (decided 2026-11-14)
  const level = stack[stack.length - 1];
  const L = LEVELS[level];
  const lastClick = useRef({});
  const open = id => { const t = openTarget(id); if (!t) return; setStack([...stack, t]); setSel(null); };
  const reveal = id => { const p = pathTo(id); setStack(p.length ? p : ['report']); setSel(id); };
  const lk = WS[level] ? 'ws' : 'block';
  const { nodes, edges } = useMemo(() => {
    const list = L.nodes;
    const paramT = new Set(L.edges.filter(e => e[4] === 'param' && e[3] === '__params').map(e => e[2]));
    const nodes = list.map(([id, kind, x, y, ins, outs, top, bottom]) => ({ id, type: kind, position: { x, y }, data: { ins, outs, top, bottom, meta: top && !Array.isArray(top) ? top : null, params: paramT.has(id), lk }, draggable: kind !== 'mini' }));
    if (L.lanes) L.lanes.forEach(([c, x, y, w, hh]) => nodes.unshift({ id: 'lane:' + c, type: 'lane', position: { x, y }, data: { ch: c, w, h: hh }, draggable: false, zIndex: -1, selectable: true }));
    const edges = L.edges.map(([s, sp, t, tp, style, key, gap], k) => ({ id: key ? 'edge:' + key : 'e' + k, source: s, sourceHandle: sp, target: t, targetHandle: tp, className: (style || '') + (key ? ' pick' : ''), type: 'default', data: { key, gap } }));
    return { nodes, edges };
  }, [level]);
  const shownEdges = edges.filter(e => showOrder || !/\b(order|chain)\b/.test(e.className));
  const rel = useMemo(() => {
    if (sel && sel.startsWith('edge:')) { const e = edges.find(x => x.id === sel); return e ? new Set([e.source, e.target]) : null; }
    if (!sel || sel.startsWith('lane:')) return null;
    const s = new Set([sel]); shownEdges.forEach(e => { if (e.source === sel) s.add(e.target); if (e.target === sel) s.add(e.source); }); return s;
  }, [sel, edges, showOrder]);
  const [live, setLive] = useState(nodes);
  useEffect(() => { setLive(nodes); }, [nodes]);
  const onNodesChange = ch => setLive(ns => applyNodeChanges(ch, ns));
  const base = live.length === nodes.length && live.every((n, i) => n.id === nodes[i].id) ? live : nodes;
  const stc = id => { if (!showRun) return ''; const s = nodeState(id, t); return (s ? ' st-' + s : '') + (searchingWithout(id, t) ? ' st-without' : ''); };
  const fileOfEdge = e => isFile(e.source) ? e.source : ((e.sourceHandle || '').match(/^k(kb_[a-z]+)_filed$/) || [])[1];
  const vn = base.map(n => ({ ...n, className: (rel && n.type !== 'lane' && !rel.has(n.id) ? 'dim' : '') + (n.id === sel ? ' picked' : '') + (n.type === 'lane' ? '' : stc(n.id) + steerCls(n.id)) }));
  const ve = shownEdges.map(e => { const f = showRun && /\bkbw\b/.test(e.className) ? fileOfEdge(e) : null; return { ...e, className: e.className + (f ? ' kb-' + fileState(f, t) : '') + (rel ? (e.id === sel || e.source === sel || e.target === sel ? ' hl' : ' dim') : '') }; });
  useEffect(() => { const t = setTimeout(() => { if (sel && level !== 'all' && nodes.some(n => n.id === sel)) rf.fitView({ nodes: [{ id: sel }], padding: 1.2, duration: 300, maxZoom: 1 }); else rf.fitView({ padding: FIT_PAD, duration: 250 }); }, 40); return () => clearTimeout(t); }, [level]);
  // a handoff node's other side: the block or workstream that makes it, or the ones that take it
  // a handoff node's other side: the block or workstream that makes it, or the ones that take it
  const has = (lv, id) => !!(LEVELS[lv] && (LEVELS[lv].nodes || []).some(n => n[0] === id));
  const landing = (step, sel) => {
    const p = pathTo(step); if (!p.length) return null;
    let k = p.length - 1; while (k > 0 && !has(p[k], sel)) k--;
    if (!has(p[k], sel)) k = p.length - 1;
    const lv = p[k], B = BLOCKS[lv], W = WS[lv];
    const where = B ? B.title + ' · ' + (WS[p[1]] ? WS[p[1]].title : '') : W ? W.title : 'Report';
    return { path: p.slice(0, k + 1), sel: has(lv, sel) ? sel : has(lv, step) ? step : null, where };
  };
  const sides = id => {
    const key = id.slice(3), m = key.match(/^k(kb_[a-z]+|\d+)_(\w+)$/); if (!m) return [];
    const [, src, port] = m;
    if (id.startsWith('lt:')) { const d = landing(src, 'eo:' + key); return d ? [d] : []; }
    const inside = new Set(stepsOf(level)), seen = new Set(), out = [];
    LINKS_ALL.forEach(l => { if (l[0] !== src || l[1] !== port || l[4] === 'order' || inside.has(l[2])) return;
      const d = landing(l[2], 'lt:' + key); if (!d) return; const k = d.path.join('/'); if (seen.has(k)) return; seen.add(k); out.push(d); });
    return out;
  };
  const goSide = d => { setStack(d.path); setSel(d.sel); };
  const onClick = (e, n) => {
    const t = Date.now(), id = n.id;
    if (/^(lt|eo):/.test(id)) { const ss = sides(id); if (ss.length === 1) { goSide(ss[0]); return; } if (sel === id) { setSel(null); return; } setSel(id); rf.setCenter(n.position.x + 80, n.position.y + 70, { zoom: Math.max(rf.getZoom(), 0.8), duration: 250 }); return; }
    const target = id.startsWith('lane:') ? id.slice(5) : id;
    if (lastClick.current.id === id && t - lastClick.current.t < 450 && openTarget(target)) { lastClick.current = {}; open(target); return; }
    lastClick.current = { id, t }; setSel(id);
  };
  const view = stack[0];
  return (<Ctx.Provider value={{ ...outerCtx, open, showRun, showOrder, select: setSel, sel, t, pol, act, fileLook, nodeLook, sides, goSide }}>
    <div className="tbar">
      <div className="seg" role="group" aria-label="View">{[['report', 'Workstreams'], ['all', 'Every step']].map(([k, l]) => (<button type="button" key={k} aria-pressed={view === k} className={view === k ? 'on' : ''} onClick={() => { setStack([k]); setSel(null); }}>{l}</button>))}</div>
      <span className="grow" />
      <div className="key"><span><i className="kb" />Workstream, block</span><span><i className="ka" />AI step</span><span><i className="kc" />Code, data, output</span><span><i className="kp" />Plumbing</span><span><i className="kg" />File in knowledgebase</span></div>
    </div>
    <div className={'board ns-' + nodeLook}>
      <div className={'canvas' + (sel ? '' : ' focus')}>
        <BoardNav stack={stack} setStack={setStack} setSel={setSel} />
        <ReactFlow nodes={vn} edges={ve} onNodesChange={onNodesChange} nodeTypes={nodeTypes} onEdgeClick={(e, ed) => { if (ed.data && ed.data.key) setSel('edge:' + ed.data.key); }} onNodeClick={onClick} zoomOnDoubleClick={false} onPaneClick={() => setSel(null)} nodesConnectable={false} minZoom={0.06} maxZoom={1.6} proOptions={{ hideAttribution: true }} defaultEdgeOptions={{ type: 'default' }} onlyRenderVisibleElements={level === 'all'}>
          <Background gap={20} size={1} color="var(--hair2)" />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>
      <aside className="insp" aria-label="Inspector"><Inspector key={level + ':' + sel} sel={sel} level={level} open={open} reveal={reveal} /></aside>
    </div></Ctx.Provider>);
}
/* ---------- run timeline ---------- */
const ALLSTEPS = LEVELS.all.nodes.map(n => n[0]).filter(id => !isFile(id));
const WAITS = [[900, '15 min'], [1800, '30 min'], [3600, '1 hour'], [14400, '4 hours'], [Infinity, 'never, keep waiting']];
const waitLabel = w => (WAITS.find(x => x[0] === w) || [0, ''])[1];
const polLabel = p => p.policy === 'pause' ? 'Pause and ask · ' + (p.wait === Infinity ? 'no time limit' : waitLabel(p.wait)) : 'Go on and flag';
function RunSettings({ pol, setPol, onClose }) {
  const pick = policy => setPol({ ...pol, policy, action: null });
  return (<div className="rset" role="dialog" aria-label="Run settings">
    <div className="rset-h"><b>Run settings</b><button type="button" className="x" aria-label="Close" onClick={onClose}>×</button></div>
    <div className="rset-row"><span>Model</span><span>The run's model</span></div>
    <div className="rset-row"><span>Research access</span><span>The open web</span></div>
    <fieldset className="rset-f"><legend>If a research job fails</legend>
      <label className={'rcard' + (pol.policy === 'pause' ? ' on' : '')}><input type="radio" name="kbfail" checked={pol.policy === 'pause'} onChange={() => pick('pause')} />
        <span><b>Pause what needs it and ask me</b><em>Steps that search for that research wait. Everything else keeps going. You choose to retry it or go on without it.</em></span></label>
      {pol.policy === 'pause' ? (<div className="rwait"><label htmlFor="rwait">If nobody answers, go on without it after</label>
        <select id="rwait" value={String(pol.wait)} onChange={e => setPol({ ...pol, wait: Number(e.target.value), action: null })}>{WAITS.map(([v, l]) => (<option key={l} value={String(v)}>{l}</option>))}</select></div>) : null}
      <label className={'rcard' + (pol.policy === 'flag' ? ' on' : '')}><input type="radio" name="kbfail" checked={pol.policy === 'flag'} onChange={() => pick('flag')} />
        <span><b>Go on without it and flag it</b><em>Nothing waits. The report marks every section written without that research.</em></span></label>
    </fieldset>
    <p className="mut">In this prototype, changing it replays the run under the new setting.</p>
  </div>);
}
function Timeline({ t, setT, playing, setPlaying, pol, setPol, hold, choose, onRestart, onScrub }) {
  const [open, setOpen] = useState(false);
  const d = toD(t), pct = d / DTOT * 100;
  const done = ALLSTEPS.filter(id => ['done', 'skipped'].includes(stepState(id, t))).length;
  const run = ALLSTEPS.filter(id => stepState(id, t) === 'running').length;
  const paused = ALLSTEPS.filter(id => stepState(id, t) === 'paused').length;
  const inSeg = SEG.findIndex(([a, b]) => t >= a - 0.01 && t <= b + 0.01);
  const label = atEnd(t) ? 'Finished' : inSeg < 0 ? 'Stalled' : inSeg > 0 ? 'After the resume' : 'First pass';
  const q = SIM.q;
  const marks = [[q.failAt, 'fail', 'Question research failed']].concat(Object.keys(FILES).map(f => [f === 'kb_q' ? q.filedAt : SIM.fin[FILES[f].research], 'filed', FILES[f].title + ' filed']));
  if (q.resolve > q.failAt + 1 && q.resolve < q.filedAt - 1) marks.push([q.resolve, 'go', 'Went on without the question research']);
  const brk = SEG.length > 1 ? SLEN[0] / DTOT * 100 : null;
  return (<div className="tl">
    <button type="button" className="tlp" aria-label={playing ? 'Pause' : 'Play the run'} onClick={() => { if (hold != null) { choose('retry', true); return; } if (!playing && atEnd(t)) { onRestart(); setT(SEG[0][0]); } setPlaying(!playing); }}>{playing ? (<svg viewBox="0 0 12 12"><rect x="2" y="1.5" width="3" height="9" /><rect x="7" y="1.5" width="3" height="9" /></svg>) : (<svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" /></svg>)}</button>
    <div className="tlmain">
      <div className="tltrack">
        <div className="tlseg" style={{ width: (brk || 100) + '%' }}><span>First pass · {fmtT(SLEN[0])}</span></div>
        {brk != null ? (<><div className="tlbrk" style={{ left: brk + '%' }} title="Nothing ran here. The time is folded so the run fits."><span>Nothing ran for {fmtT(SEG[1][0] - SEG[0][1])}</span></div>
          <div className="tlseg r" style={{ left: brk + '%', width: (100 - brk) + '%' }}><span>After the resume · {fmtT(SLEN.slice(1).reduce((a, b) => a + b, 0))}</span></div></>) : null}
        <div className="tlfill" style={{ width: pct + '%' }} /><i className="tlknob" style={{ left: pct + '%' }} />
        {marks.map(([tt, k, n], i) => (<i key={i} className={'tlm ' + k} style={{ left: toD(tt) / DTOT * 100 + '%' }} title={n} />))}
        <input type="range" min="0" max={DTOT} step="0.5" value={d} aria-label="Run time" aria-valuetext={label + ', ' + fmtClock(t) + ' in'} onInput={e => { setPlaying(false); onScrub(); setT(toT(+e.target.value)); }} />
      </div>
    </div>
    <div className="tlr"><b>{label} · {fmtClock(t)} in</b><span>{done} of {ALLSTEPS.length} steps done{run ? ` · ${run} running` : ''}{paused ? (<> · <b className="pz">{paused} paused</b></>) : ''}</span><span className="tlnote">Made-up run, replayed</span></div>
    <div className="rsetwrap"><button type="button" className="jbtn rsetb" aria-expanded={open} onClick={() => setOpen(!open)}>Run settings<em>{polLabel(pol)}</em></button>
      {open ? (<RunSettings pol={pol} setPol={setPol} onClose={() => setOpen(false)} />) : null}</div>
    <button type="button" className="jbtn" onClick={() => { setPlaying(false); setT(TEND); }} disabled={atEnd(t)}>End</button>
  </div>);
}
/* ---------- the banner slot (decided 2026-11-14) ----------
   One strip of fixed height under the timeline, always there, so nothing below it moves. It holds
   a status line when nothing is wrong, and the failure, retry, success and steering banners when
   something is. Each new state cross-fades in. */
const HOLD_MS = 10000; // playing into the crash stops playback; the recorded Retry plays after this long
// A recorded or chosen action counts only once the replay reaches its time.
const actNow = (pol, t) => !!(pol.action && t >= pol.action.at);
const WRITERS = [...new Set(ORDER_CHAIN.flat())];
function statusLine(t) {
  if (t <= 0.01) return { key: 'idle', kind: 'none', title: 'Ready to replay', body: 'Press play to watch the run, or drag the timeline.' };
  if (atEnd(t)) return { key: 'end', kind: 'none', title: 'Finished', body: 'The report is published. Every step can be opened; the Report and Knowledgebase tabs show what it made.' };
  const w = WRITERS.findIndex(id => stepState(id, t) === 'running');
  if (w >= 0) return { key: 'writing', kind: 'none', title: `Writing ${w + 1} of ${WRITERS.length}`, body: info(WRITERS[w]).title };
  const rs = ALLSTEPS.filter(id => stepState(id, t) === 'running');
  return { key: 'running', kind: 'none', title: `${rs.length} ${rs.length === 1 ? 'step' : 'steps'} running`, body: rs.slice(0, 3).map(id => info(id).title).join(', ') + (rs.length > 3 ? ` and ${rs.length - 3} more` : '') };
}
function bannerFor({ t, pol, hold, act, choose, goReport, steer, setSteer }) {
  const q = SIM.q;
  if (atEnd(t) && steer.rerun !== 'none' && steer.rerun !== 'editing' && steer.last === 'rerun') return steerBanner(steer, setSteer, goReport);
  if (atEnd(t) && steer.rewrite === 'done' && steer.last === 'rewrite') return { key: 'rewrite', kind: 'green', title: `“${info(STEER.rewrite.step).title}” rewritten with your instruction`, body: 'Nothing else used this section, so nothing else changed.', right: (goReport ? (<button type="button" className="btn sec" onClick={goReport}>Show the report</button>) : null) };
  if (t < q.failAt) return statusLine(t);
  const fs = fileState('kb_q', t);
  const ran = KBR.readers.filter(r => SIM.without[r[0]] && ['running', 'done'].includes(stepState(r[0], t))).length;
  const pausedNow = KBR.readers.filter(r => stepState(r[0], t) === 'paused').length;
  const undo = actNow(pol, t) && pol.action !== STORY.policy.action ? (<button type="button" className="lnk" onClick={() => act(null)}>Undo choice</button>) : null;
  const flags = goReport ? (<button type="button" className="btn sec" onClick={goReport}>Show flagged sections</button>) : null;
  if (fs === 'filed') {
    if (ran) return { key: 'late', kind: 'amber', title: 'The question research was filed late', body: `${ran} steps had already searched without it. Their sections are flagged in the report.`, right: (<>{undo}{flags}</>) };
    const n = Object.keys(SIM.paused).length;
    if (t < q.filedAt + 3 * DTOT / 45) return { key: 'filed', kind: 'green', title: 'Question research filed', body: n ? `${n} waiting steps resumed.` : 'Steps that search for it can use it now.' };
    return statusLine(t);
  }
  if (fs === 'retry') return { key: 'retry', kind: 'blue', title: 'Retrying the question research', body: `${pol.action && pol.action.rec ? 'Retried as in the recorded run.' : 'You chose Retry.'} ${pausedNow ? `${pausedNow} steps that search for it are waiting.` : 'Steps that search for it will wait for it.'}`, right: undo };
  if (pol.policy === 'pause' && t < q.resolve && !actNow(pol, t)) return { key: 'failed', kind: 'red', title: 'Question research failed',
    body: (<><span>The research job crashed while reading a PDF, so there is nothing to file.</span><span className="mut">{pausedNow ? `${pausedNow} steps that search for it are paused.` : 'Steps that search for it will pause when they get there.'} Everything else keeps going.</span></>),
    right: (<div className="fbr-col"><div className="factions compact"><button type="button" className="btn sec" onClick={() => choose('continue')}>Go on without it</button><button type="button" className="btn pri" onClick={() => choose('retry')}>Retry research</button></div>
      <span className="fbc">{hold != null ? (<>Retrying in <b>{Math.ceil(hold / 1000)} s</b>, as in the recorded run</>) : `In the recorded run, Retry was pressed at ${fmtClock(STORY.policy.action.at)}`}</span></div>) };
  const why = pol.policy === 'flag' ? 'This run was set to go on without it.' : pol.action && pol.action.kind === 'continue' ? 'You chose to go on without it.' : 'Nobody answered within the time limit, so the run went on without it.';
  return { key: 'without', kind: 'amber', title: 'Going on without the question research', body: `${why} ${ran ? `${ran} steps have searched without it so far. Their sections are flagged in the report.` : 'Steps that search will run without it.'}`, right: (<>{undo}{flags}</>) };
}
const BICON = {
  red: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>),
  blue: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></svg>),
  green: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>),
  amber: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>),
};
function BannerBox({ b, cls }) {
  if (b.kind === 'none') return (<div className={'bstatus ' + cls} role="status"><b>{b.title}</b><span>{b.body}</span></div>);
  return (<div className={'fbanner b-' + b.kind + ' ' + cls} role="status"><span className="fbi">{BICON[b.kind]}</span><div className="fbt"><b>{b.title}</b>{b.body}</div><div className="fbr">{b.right}</div></div>);
}
function BannerSlot({ b }) {
  const last = useRef(b), [prev, setPrev] = useState(null);
  useEffect(() => {
    if (last.current.key === b.key) { last.current = b; return undefined; }
    setPrev(last.current); last.current = b;
    const tm = setTimeout(() => setPrev(null), 260);
    return () => clearTimeout(tm);
  }, [b]);
  return (<div className="bslot">{prev && prev.key !== b.key ? (<BannerBox key={'out-' + prev.key} b={prev} cls="b-out" />) : null}<BannerBox key={b.key} b={b} cls="b-in" /></div>);
}

/* ---------- report panel ---------- */
const BUILT = { 'Knowledge Graph': 'Built by Assemble from the facts and the knowledgebase.', 'Sources & Methods': 'Built by Assemble from every cited page.', 'Behind the Report': 'Built by Assemble from the run record.' };
const kindItem = id => { const i = info(id); return i.type === 'flow/foreach' ? 'repeat' : i.type.startsWith('viz/') ? 'figure' : 'section'; };
const simShift = id => (SIM.start[id] != null && G[id] && G[id].start != null ? SIM.start[id] - G[id].start : 0);
const secState = (id, t) => {
  const i = info(id), s = stepState(id, t);
  if (s === 'skipped') return 'skipped';
  if (s === 'running') return 'writing';
  if (s === 'done') return id === '21' ? 'empty' : i.declined ? 'declined' : 'done';
  if (i.ready != null && t >= i.ready + simShift(id) && i.after) return 'queued';
  return 'blank';
};
const SECW = { blank: 'Not started', queued: 'Ready, waiting its turn to write', writing: 'Writing', done: 'Written', declined: 'Declined to write', skipped: 'Skipped: its gate found nothing', empty: 'Nothing produced: no items' };
function Skel({ n }) { return (<div className="skel" aria-hidden="true">{Array.from({ length: n }).map((_, k) => (<i key={k} style={{ width: [96, 88, 92, 70, 84][k % 5] + '%' }} />))}</div>); }
// In the report a fact token shows the value Assemble put in; the token itself is on hover and focus.
// A token that names no fact stays raw, as the engine would reject it (decided 2026-11-14).
const factOf = key => { const [ns, k] = key.split('.'); return FACTS[ns] && FACTS[ns][k]; };
const withTokens = txt => txt.split(/(\{\{fact:[^}]*\}\})/).map((x, k) => {
  if (!/^\{\{fact:/.test(x)) return x;
  const key = x.slice(7, -2), f = factOf(key);
  return f ? (<span key={k} className="tokv" tabIndex={0} title={`${f[1]} · fact token ${key}`}><span className="tokv-v">{f[0]}</span><code className="tokv-k" aria-hidden="true">{key}</code></span>) : (<code key={k} className="tok" title="A fact token. Assemble puts the number in.">{key}</code>);
});
const isFlagged = (id, t) => SIM.flagged.has(id) && ['writing', 'done', 'declined'].includes(secState(id, t));
function RSection({ id, title, t, reveal }) {
  const i = info(id), k = kindItem(id), st = secState(id, t);
  const after = i.after && st === 'queued' ? nameOf(i.after) : null;
  const body = () => {
    if (st === 'writing') return (<Skel n={k === 'figure' ? 2 : 4} />);
    if (st === 'blank' || st === 'queued') return (<div className="rph">{after ? (<>Waits for “{after}” to finish writing</>) : k === 'figure' ? 'A figure goes here' : 'This section is written here'}</div>);
    if (st === 'skipped' || st === 'empty' || st === 'declined') return (<div className="rph bad">{SECW[st]}</div>);
    if (k === 'figure') return (<div className="rfig"><svg viewBox="0 0 120 40" aria-hidden="true">{i.type === 'viz/table' ? [0, 1, 2, 3].flatMap(r => [0, 1, 2].map(c => (<rect key={r + '.' + c} className={r ? '' : 'th'} x={4 + c * 38} y={2 + r * 9.5} width="35" height="7.5" rx="1" />))) : [14, 22, 18, 30, 26, 34, 24].map((v, j) => (<rect key={j} x={4 + j * 16} y={38 - v} width="10" height={v} rx="1.5" />))}</svg><span>{i.type === 'viz/table' ? 'Table' : 'Chart'} · drawn in code from recorded data</span></div>);
    if (id === '58') return (<ol className="rsub">{(i.subs || []).map(([a0, dd], j) => { const a = a0 + SIM.shift58; const ss = t < a ? 'blank' : t < a + dd ? 'writing' : 'done'; return (<li key={j} className={ss}><b>Topic {j + 1}</b>{ss === 'writing' ? (<Skel n={2} />) : ss === 'done' ? (<span>Written in {fmtT(dd)}</span>) : (<span className="mut">Not started</span>)}</li>); })}</ol>);
    return i.out ? (<p className="rtext">{withTokens(i.out)}</p>) : (<p className="rtext mut">Written in {fmtT(i.dur)}. The text is not captured in this prototype.</p>);
  };
  return (<article className={'rsec k-' + k + ' s-' + st} id={'rs-' + id}>
    <header><h4>{title}</h4><button type="button" className="olink" onClick={() => reveal(id)}><em className="src">{placeOf(id)}</em></button></header>
    <div className="rstate"><i className={'dot s-' + st} />{SECW[st]}{st === 'done' && i.dur ? ' · ' + fmtT(i.dur) : ''}{isFlagged(id, t) ? (<span className="flag">Written without the question research</span>) : null}<SecFlag id={id} t={t} /></div>
    {body()}
    {id === STEER.rewrite.step ? (<RewritePanel t={t} />) : null}
  </article>);
}
function ReportPanel({ t, reveal }) {
  const items = REPORT_OUTLINE.flatMap(([, it]) => it.map(x => x[0]));
  const cnt = s => items.filter(id => secState(id, t) === s).length;
  const nflag = items.filter(id => isFlagged(id, t)).length;
  const asm = stepState('105', t), pub = stepState('106', t);
  const go = k => { const el = document.getElementById('rp-' + k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  return (<div className="rp">
    <aside className="rrail">
      <span className="micro">Report so far</span>
      <div className="rcount"><b>{cnt('done') + cnt('declined')}</b> of {items.length} written{cnt('writing') ? (<span> · {cnt('writing')} writing</span>) : null}{cnt('queued') ? (<span> · {cnt('queued')} waiting their turn</span>) : null}{cnt('skipped') + cnt('empty') ? (<span> · {cnt('skipped') + cnt('empty')} skipped or empty</span>) : null}</div>
      <div className="rbar">{items.map(id => (<i key={id} className={'s-' + secState(id, t) + (isFlagged(id, t) ? ' fl' : '')} title={nameOf(id)} />))}</div>
      {nflag ? (<div className="rflagn"><span className="flag">{nflag} written without the question research</span></div>) : null}
      <ol className="rtoc">{REPORT_OUTLINE.map(([title, it], k) => { const ss = it.map(x => secState(x[0], t)); const st = !it.length ? (asm === 'done' ? 'done' : 'blank') : ss.includes('writing') ? 'writing' : ss.every(x => x !== 'blank' && x !== 'queued') ? 'done' : ss.some(x => x === 'done') ? 'part' : 'blank';
        const fl = it.some(x => isFlagged(x[0], t));
        return (<li key={title} className={'s-' + st}><button type="button" onClick={() => go(k)}><i className={'dot s-' + st} /><span>{k + 1}. {title}</span>{fl ? (<em className="fl">flagged</em>) : null}</button></li>); })}</ol>
      <div className="rnote"><span className="micro">Why sections write one at a time</span><p>Each writer reads every section already written, so it can add instead of repeat. To make sure those sections exist, the engine chains all 21 writers in a fixed order. In this run, writing took 29 of the 38 minutes, all in single file.</p>
        <p>“Link Prediction: Emerging Papers” was skipped: its gate found no candidates. The writer after it went straight on.</p></div>
    </aside>
    <div className="rdoc" role="document">
      <div className="rhead"><span className="micro">Futurity Insight Report</span><h2>Small Modular Reactors</h2><p className="mut">Sections appear in the template's order. They are written in a different order, as their inputs come in.</p></div>
      {REPORT_OUTLINE.map(([title, it], k) => (<section key={title} className="rpart" id={'rp-' + k}><h3><span>{k + 1}</span>{title}</h3>
        {it.length ? it.map(([id, tt]) => (<RSection key={id} id={id} title={tt} t={t} reveal={reveal} />)) : (<article className={'rsec k-built s-' + (asm === 'done' ? 'done' : asm === 'running' ? 'writing' : 'blank')}><div className="rstate"><i className={'dot s-' + (asm === 'done' ? 'done' : 'blank')} />{asm === 'done' ? 'Built' : 'Built when the report is assembled'}</div>{asm === 'done' ? (<p className="rtext mut">{BUILT[title]}</p>) : (<div className="rph">{BUILT[title]}</div>)}</article>)}
      </section>))}
      <div className={'rfoot s-' + pub}><i className={'dot s-' + pub} />{pub === 'done' ? `Assembled and published ${fmtClock(SIM.fin['106'])} in.` : asm === 'running' ? 'Assembling' : 'Assemble and Publish run when every section is in.'}</div>
    </div>
  </div>);
}

/* ---------- knowledgebase panel ---------- */
const depName = k => { const m = k.match(/^58\[(\d+)\]:(\d+)$/); return m ? nameOf(m[2]) + ' · topic ' + (+m[1] + 1) : nameOf(k); };
const depWs = k => { const b = k.startsWith('58[') ? '58' : k; const w = wsOf(b); return w ? WS[w].title : 'Report'; };
const DEPK = { research: 'Research', section: 'Section', ai: 'Agent finding', data: 'Data', report: 'Report' };
function Growth({ t }) {
  const W = 640, H = 150, P = { l: 30, r: 10, t: 12, b: 22 };
  const D_ = SIM.deps, max = D_.length;
  const x = tt => P.l + toD(tt) / DTOT * (W - P.l - P.r), y = n => H - P.b - n / max * (H - P.t - P.b);
  let pts = `M${x(SEG[0][0])},${y(0)}`; D_.forEach((d, k) => { if (d[0] <= t) pts += ` H${x(d[0])} V${y(k + 1)}`; });
  const nNow = D_.filter(d => d[0] <= t).length; pts += ` H${x(t)}`;
  const bx = SEG.length > 1 ? x(SEG[0][1]) : null;
  return (<svg className="grow" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Items filed in the knowledgebase over the run: ${nNow} of ${max} so far`}>
    {[0, Math.round(max / 2), max].map(v => (<g key={v}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="gl" /><text x={P.l - 6} y={y(v) + 3} className="ax" textAnchor="end">{v}</text></g>))}
    {bx != null ? (<><line x1={bx} x2={bx} y1={P.t} y2={H - P.b} className="brk" /><text x={bx + 4} y={H - 8} className="ax">resumed</text></>) : null}<text x={P.l} y={H - 8} className="ax">launch</text>
    <path d={pts} className="ln" />
    {D_.filter(d => d[2] === 'research').map(d => (<g key={d[1]} className={d[0] <= t ? 'on' : ''}><circle cx={x(d[0])} cy={y(D_.indexOf(d) + 1)} r="4.5" className="rd" /><title>{nameOf(d[1])}: filed {fmtT(d[0])} in</title></g>))}
    <line x1={x(t)} x2={x(t)} y1={P.t} y2={H - P.b} className="now" />
  </svg>);
}
function KbPanel({ t, reveal, fileLook }) {
  const D_ = SIM.deps.filter(d => d[0] <= t);
  const byK = k => D_.filter(d => d[2] === k).length;
  const fs = Object.keys(FILES), filed = fs.filter(f => fileState(f, t) === 'filed').length;
  const feed = [...D_].reverse().slice(0, 40);
  const without = KBR.readers.filter(r => SIM.without[r[0]]).length;
  const rstate = r => { const s = stepState(r[0], t); return s === 'wait' ? 'Waiting' : s === 'paused' ? 'Paused' : s === 'running' ? (SIM.without[r[0]] ? 'Searching without the question' : 'Searching') : (SIM.without[r[0]] ? 'Done without the question' : 'Done'); };
  return (<div className="kp">
    <div className="kmain">
      <div className="khead"><span className="micro">Knowledgebase</span><h2>What steps can search</h2>
        <p>It starts with the lab's own material. Then it fills with what this run files: every page a research job reads, its report, and each step's output as the step finishes. Earlier runs are never in it.</p>
        <div className="kstats"><div><b>{filed}</b>of 4 research jobs filed</div><div><b>{D_.length - byK('research') - byK('report')}</b>step outputs filed</div><div><b>{KBR.readers.filter(r => ['running', 'done'].includes(stepState(r[0], t))).length}</b>of {KBR.readers.length} searchers started</div></div></div>
      <div className="kblk"><span className="micro">Research filings</span><div className="kfiles">{fs.map(f => (<div key={f} className="kf"><FileFace f={f} st={fileState(f, t)} look={fileLook} handles={false} onClick={() => reveal(f)} /></div>))}</div></div>
      <div className="kblk"><span className="micro">Filed over the run</span><Growth t={t} /><p className="mut">Each step is one item filed. The four dots are the research jobs, which file many pages each. The page counts are not captured in this prototype.</p></div>
      <div className="kblk"><span className="micro">Filed, newest first</span>{feed.length ? (<ol className="kfeed">{feed.map(([tt, k, kind]) => (<li key={k} className={'k-' + kind}><span className="kt">{fmtClock(tt)}</span><button type="button" className="olink" onClick={() => reveal(k.startsWith('58[') ? '58' : k)}><span>{depName(k)}</span><em className="src">{depWs(k)}</em></button><em className="kk">{DEPK[kind]}</em></li>))}</ol>) : null}
        {D_.length > 40 ? (<p className="mut">and {D_.length - 40} earlier</p>) : null}
        <ol className="kfeed"><li className="k-lab"><span className="kt">from the start</span><span>The lab's own material</span><em className="kk">Lab</em></li></ol></div>
    </div>
    <aside className="kside">
      <span className="micro">Who searches it</span>
      <table className="kbt"><thead><tr><th>Step</th><th>Now</th></tr></thead><tbody>{KBR.readers.map(r => { const s = rstate(r); return (<tr key={r[0]} className={s === 'Paused' ? 'bad' : /without/.test(s) ? 'warn' : ''}><td><button type="button" className="olink" onClick={() => reveal(r[0])}><span>{nameOf(r[0])}</span><em className="src">{WS[r[1]].title} · needs {needsText(r[0])}</em></button></td><td className="num kn">{s}</td></tr>); })}</tbody></table>
      <div className={without ? 'warnnote' : 'oknote'}>{without ? (<><b>{without} of {KBR.readers.length} searchers ran without the question research</b> in this replay. Their sections are flagged in the report.</>) : (<><b>Every searcher waited for all its filings</b> in this replay.</>)}</div>
      <p className="mut">In a run limited to the knowledgebase, searchers work only from what is filed.</p>
    </aside>
  </div>);
}

/* ---------- steering (decided 2026-11-14) ----------
   Rerun "Emerging papers" with a lower threshold: the engine reruns its dependents on its own, so
   the form previews everything that will rerun (outlined on the board) before it starts. Rewrite
   one report section with an added instruction. Both only once the run has finished. */
const ST0 = { rerun: 'none', rewrite: 'none', thr: STEER.rerun.to, last: null };
let ST = ST0;
const RR = STEER.rerun, RSTEPS = RR.steps, DEPS = RR.stale, RALL = [...RR.steps, ...RR.stale];
const RERUN_MS = 2500; // how long the rerun shows as running
const isRerunning = id => ST.rerun === 'running' && RALL.includes(id);
const isNewRun = id => ST.rerun === 'done' && RALL.includes(id);
const blockTitle = () => BLOCKS[RR.block].title;
function steerInfo(id, i) {
  if (ST.rerun === 'done' && RR.result[id]) return { ...i, ...RR.result[id], skipped: false, note: null, attempts: [] };
  if (ST.rewrite === 'done' && id === STEER.rewrite.step) return { ...i, ...STEER.rewrite.result, declined: false, note: null };
  return i;
}
function steerCls(id) {
  const ss = isBox(id) ? stepsOf(id) : [id];
  if (ST.rerun === 'editing' && ss.some(x => RALL.includes(x))) return ' st-pend';
  if (ss.some(isNewRun)) return isBox(id) ? ' st-hasnew' : ' st-new';
  return '';
}
function SteerLine({ id }) {
  const { steer } = useContext(Ctx);
  if (steer.rerun === 'editing') return RSTEPS.includes(id) ? (<div className="stl pend">Reruns</div>) : DEPS.includes(id) ? (<div className="stl pend">Reruns with it</div>) : null;
  return isNewRun(id) ? (<div className="stl new">Ran again · new result</div>) : null;
}
function startRerun(steer, setSteer) {
  setSteer({ ...steer, rerun: 'running', last: 'rerun' });
  setTimeout(() => setSteer(s => s.rerun === 'running' ? { ...s, rerun: 'done' } : s), RERUN_MS);
}
function RerunPanel() {
  const { steer, setSteer, reveal, t } = useContext(Ctx);
  const set = o => setSteer({ ...steer, ...o });
  const gate = info(RR.step).title;
  if (!atEnd(t)) return (<div className="steer"><span className="micro">Steer</span><p className="mut small">Rerunning a block is open once the run has finished.</p><div><button type="button" className="btn sec ghost" disabled>Change and rerun this block</button></div></div>);
  if (steer.rerun === 'running') return (<div className="steer"><span className="micro">Steer</span><div className="snote">Rerunning {RALL.length} steps with the threshold at {steer.thr}…</div></div>);
  if (steer.rerun === 'done') return (<div className="steer"><span className="micro">Steer</span>
    <div className="snote ok"><b>Ran again with the threshold at {steer.thr}.</b> {RR.result[RR.step].out} The {DEPS.length} steps that used its result ran again too; everything else kept the result it already had.</div>
    <div><button type="button" className="lnk" onClick={() => setSteer(ST0)}>Undo the rerun</button></div></div>);
  if (steer.rerun === 'editing') return (<div className="steer"><span className="micro">Steer · rerun this block</span>
    <label className="sfield"><span>{RR.setting} <em className="mut">on “{gate}”</em></span><span className="sval"><s>{RR.from}</s> → <input value={steer.thr} onChange={e => set({ thr: e.target.value })} aria-label="New threshold" /></span></label>
    <div className="snote"><b>Reruns {RALL.length} steps:</b> this block's {RSTEPS.length} and the {DEPS.length} that use its result. They are outlined on the board. Everything else keeps the result it already had.
      <ul className="slist">{DEPS.map(x => (<li key={x}><button type="button" className="lnk" onClick={() => reveal(x)}>{info(x).title}</button> <em className="mut">{placeOf(x)}</em></li>))}</ul></div>
    <div className="btns"><button type="button" className="btn sec" onClick={() => setSteer(ST0)}>Cancel</button><button type="button" className="btn pri" onClick={() => startRerun(steer, setSteer)}>Rerun {RALL.length} steps</button></div></div>);
  return (<div className="steer"><span className="micro">Steer</span><div className="sset"><span>{RR.setting} <em className="mut">on “{gate}”</em></span><b>{RR.from}</b></div>
    <p className="mut small">No paper scored {RR.from} or more, so the gate passed nothing and the block's analyst and section were skipped.</p>
    <div><button type="button" className="btn sec" onClick={() => set({ rerun: 'editing' })}>Change and rerun this block</button></div></div>);
}
function SteerStep({ id }) {
  if (id === RR.step) return (<RerunPanel />);
  if (isNewRun(id)) return (<div className="steer"><div className="snote ok"><b>Ran again</b> with the new result of “{blockTitle()}”.</div></div>);
  return null;
}
function steerBanner(steer, setSteer, goReport) {
  if (steer.rerun === 'running') return { key: 'rerunning', kind: 'blue', title: `Rerunning “${blockTitle()}” with the threshold at ${steer.thr}`, body: `${RALL.length} steps: the block's ${RSTEPS.length} and the ${DEPS.length} that use its result. Everything else keeps the result it already had.` };
  return { key: 'reran', kind: 'green', title: `“${blockTitle()}” ran again with the threshold at ${steer.thr}`, body: `Its gate passed 2 candidates, so its section is written now. The ${DEPS.length} steps that used its result ran again too.`,
    right: (<><button type="button" className="lnk" onClick={() => setSteer(ST0)}>Undo</button>{goReport ? (<button type="button" className="btn sec" onClick={goReport}>Show the report</button>) : null}</>) };
}
function SecFlag({ id, t }) {
  if (!atEnd(t)) return null;
  if (isNewRun(id)) return (<span className="flag new">{DEPS.includes(id) ? 'Rewritten with the new result' : 'Written in the rerun'}</span>);
  if (ST.rewrite === 'done' && id === STEER.rewrite.step) return (<span className="flag new">Rewritten with your instruction</span>);
  return null;
}
function RewritePanel({ t }) {
  const { steer, setSteer } = useContext(Ctx);
  if (!atEnd(t)) return null;
  const W = STEER.rewrite, set = o => setSteer({ ...steer, ...o });
  if (steer.rewrite === 'done') return (<div className="rwbox"><p className="mut small">Your instruction: “{W.instruction}”</p><p className="mut small">Nothing else used this section, so nothing else changes.</p><div><button type="button" className="lnk" onClick={() => set({ rewrite: 'none' })}>Undo the rewrite</button></div></div>);
  if (steer.rewrite === 'editing') return (<div className="rwbox"><label className="micro" htmlFor="rwi">Add an instruction</label><textarea id="rwi" rows="3" defaultValue={W.instruction} />
    <div className="btns"><button type="button" className="btn sec" onClick={() => set({ rewrite: 'none' })}>Cancel</button><button type="button" className="btn pri" onClick={() => set({ rewrite: 'done', last: 'rewrite' })}>Rewrite this section</button></div></div>);
  return (<div className="rwbox"><div><button type="button" className="btn sec" onClick={() => set({ rewrite: 'editing' })}>Rewrite with an instruction</button></div></div>);
}

const POL0 = STORY.policy;
/**
 * bar: the prototype's own top bar (label and theme switch). theme: 'auto', 'light' or 'dark'.
 * offScreen: true stops playback (the embed pauses every animation off screen).
 */
export default function App({ bar = true, theme: theme0 = 'auto', offScreen = false }) {
  const [stack, setStack] = useState(['report']);
  const [sel, setSel] = useState(null);
  const [theme, setTheme] = useState(theme0);
  const [panel, setPanel] = useState('flow');
  const showRun = true, setShowRun = () => {}; // always on in the demo (decided 2026-11-14)
  const fileLook = 'glyph', nodeLook = 'badge'; // the look switches were for choosing; decided 2026-11-14
  const setFileLook = () => {}, setNodeLook = () => {};
  const [pol, setPol] = useState(POL0);
  const sim = useMemo(() => simulate(pol), [pol]);
  useSim(sim);
  const [t, setT] = useState(0); // opens at 0:00, ready to replay (decided 2026-11-14)
  const [playing, setPlaying] = useState(false);
  useEffect(() => { if (t > sim.end) setT(sim.end); }, [sim]);
  useEffect(() => { if (offScreen) setPlaying(false); }, [offScreen]);
  useEffect(() => { if (theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme; }, [theme]);
  const [steer, setSteer] = useState(ST0);
  ST = steer;
  // hold: ms left on the countdown while a replay that played into the crash waits for a choice, or null
  const [hold, setHold] = useState(null);
  const polRef = useRef(pol); polRef.current = pol;
  useEffect(() => { if (!playing) return; const iv = setInterval(() => setT(t0 => {
    const d = toD(t0) + DTOT / 450, t1 = d >= DTOT ? TEND : toT(d), q = SIM.q, p = polRef.current;
    if (p.policy === 'pause' && !actNow(p, q.failAt) && t0 < q.failAt && t1 >= q.failAt) { setPlaying(false); setHold(HOLD_MS); return q.failAt + 0.5; }
    if (d >= DTOT) { setPlaying(false); return TEND; }
    return t1;
  }), 100); return () => clearInterval(iv); }, [playing, sim]);
  // The countdown runs only while the demo is on screen.
  useEffect(() => { if (hold == null || offScreen) return; const iv = setInterval(() => setHold(h => h == null ? h : Math.max(0, h - 250)), 250); return () => clearInterval(iv); }, [hold == null, offScreen]);
  useEffect(() => { if (hold === 0) choose('retry', true); }, [hold]);
  const choose = (kind, rec) => {
    const held = hold != null;
    setPol(p => ({ ...p, action: { kind, at: t, rec: !!rec } })); setHold(null);
    if (held) setTimeout(() => setPlaying(true), 600);
  };
  // Undo (act(null)) goes back to the recorded run, not to nobody answering.
  const act = a => { setHold(null); setPol(p => ({ ...p, action: a || STORY.policy.action })); };
  const reveal = id => { setPanel('flow'); setShowRun(true); const p = pathTo(id); setStack(p.length ? p : ['report']); setSel(id); };
  const showTl = panel !== 'flow' || showRun;
  return (<Ctx.Provider value={{ t, showRun: true, pol, act, fileLook, choose, hold, steer, setSteer, reveal, setPanel }}>{bar ? (<div className="proto"><b>Prototype</b> Engine workstreams, blocks and steps, on a made-up run<span className="sep" />Theme {['auto', 'light', 'dark'].map(k => (<button type="button" key={k} className={'jbtn' + (theme === k ? ' on' : '')} onClick={() => setTheme(k)}>{k}</button>))}</div>) : null}
    <section className="instr" aria-label="Futurity Engine">
      <div className="ihead"><h2>Futurity Engine</h2><p>SMR data-centre outlook · Insight with Deep Search · 70 steps · finished 12 Nov 2026</p></div>
      <div className="sheet">
        <div className="ptabs" role="tablist" aria-label="Panels">{[['flow', 'Workflow'], ['report', 'Report'], ['kb', 'Knowledgebase']].map(([k, l]) => (<button type="button" role="tab" key={k} aria-selected={panel === k} className={panel === k ? 'on' : ''} onClick={() => setPanel(k)}>{l}</button>))}</div>
        {showTl ? (<Timeline t={t} setT={setT} playing={playing} setPlaying={setPlaying} pol={pol} setPol={setPol} hold={hold} choose={choose} onRestart={() => { setPol(POL0); setSteer(ST0); }} onScrub={() => setHold(null)} />) : null}
        {showTl ? (<BannerSlot b={bannerFor({ t, pol, hold, act, choose, goReport: panel === 'report' ? null : () => setPanel('report'), steer, setSteer })} />) : null}
        {panel === 'flow' ? (<ReactFlowProvider><Board stack={stack} setStack={setStack} sel={sel} setSel={setSel} showRun={showRun} setShowRun={setShowRun} t={t} pol={pol} act={act} fileLook={fileLook} setFileLook={setFileLook} nodeLook={nodeLook} setNodeLook={setNodeLook} /></ReactFlowProvider>)
          : panel === 'report' ? (<ReportPanel t={t} reveal={reveal} />) : (<KbPanel t={t} reveal={reveal} fileLook={fileLook} />)}
      </div>
    </section></Ctx.Provider>);
}
