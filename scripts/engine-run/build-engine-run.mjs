// Builds the Engine demo's run data from src/data/demos/engine/smr-run.source.mjs.
// Output: src/data/demos/engine/smr-run.js, in the same structures as the Engine Blocks prototype
// (G, P, D, LEVELS, BLOCKS, CHAPTERS, LINKS_ALL, XW, KBR, …), as ES module exports.
// Usage: node scripts/engine-run/build-engine-run.mjs [out.js]
import { writeFileSync } from 'node:fs';
import * as SRC from '../../src/data/demos/engine/smr-run.source.mjs';
import { CATP, KIND, ENGINE_RULES } from './engine-constants.mjs';

const { RUN, STORY, FACTS, STEPS, WRITE_ORDER, OUTLINE, HD, STEER: STEER_SRC } = SRC;
const OUT = process.argv[2] || new URL('../../src/data/demos/engine/smr-run.js', import.meta.url).pathname;

/* ---------- index ---------- */
const S = {}; STEPS.forEach(s => { S[s.id] = s; });
const WS = {}; SRC.WS.forEach(([id, title, kind, what]) => { WS[id] = { id, title, kind, what }; });
const BL = {}; SRC.BLOCKS.forEach(([id, ws, title, what, reuse]) => { BL[id] = { id, ws, title, what, reuse: reuse || null, steps: [] }; });
STEPS.forEach(s => { if (s.block) BL[s.block].steps.push(s.id); });
const FILEDEF = { kb_q: ['Question research', '182', 'c_ground'], kb_eng: ['Engineering research', '151', 'c_eng'], kb_sci: ['Science research', '161', 'c_sci'], kb_biz: ['Business research', '171', 'c_biz'] };
const FILE_OF_RESEARCH = Object.fromEntries(Object.entries(FILEDEF).map(([f, d]) => [d[1], f]));
const isFile = id => !!FILEDEF[id];
const wsOf = id => isFile(id) ? FILEDEF[id][2] : (S[id] || {}).ws || null;
const title = id => isFile(id) ? FILEDEF[id][0] : S[id].title;
const PRODUCT_TYPES = ['report/section', 'viz/table', 'viz/chart'];
const isProduct = id => S[id] && PRODUCT_TYPES.includes(S[id].type);
const isAI = id => S[id] && ['research/deep', 'agent/react', 'agent/debate', 'agent/conclude', 'report/section'].includes(S[id].type);

/* ---------- links ---------- */
const LINKS = [];
STEPS.forEach(s => Object.entries(s.in || {}).forEach(([dport, srcs]) => srcs.forEach(x => {
  const [src, sport] = x.split('.'); LINKS.push([src, sport, s.id, dport, '']);
})));
WRITE_ORDER.slice(1).forEach((id, k) => LINKS.push([WRITE_ORDER[k], 'section', id, 'after', 'order']));
Object.entries(FILEDEF).forEach(([f, [, r]]) => LINKS.push([r, 'deposits', f, 'pages', 'kbw']));
STEPS.forEach(s => (s.kb || []).forEach(f => LINKS.push([f, 'filed', s.id, 'kb', 'kbw'])));
const preds = id => LINKS.filter(l => l[2] === id);
const succs = id => LINKS.filter(l => l[0] === id);

/* ---------- schedule ---------- */
const start = {}, fin = {}, skipAt = {}, ready = {};
const q = { id: STORY.q.id };
const order = [];
(function topo() {
  const seen = new Set(), tmp = new Set();
  const visit = id => { if (seen.has(id)) return; if (tmp.has(id)) throw new Error('cycle at ' + id); tmp.add(id); preds(id).forEach(l => visit(l[0])); tmp.delete(id); seen.add(id); order.push(id); };
  [...STEPS.map(s => s.id), ...Object.keys(FILEDEF)].forEach(visit);
})();
const doneAt = id => id in fin ? fin[id] : id in skipAt ? skipAt[id] : 0;
const productIds = STEPS.filter(s => isProduct(s.id)).map(s => s.id);
order.forEach(id => {
  const s = S[id];
  if (id === '1') { start[id] = 0; fin[id] = 0; return; }
  if (isFile(id)) { fin[id] = id === 'kb_q' ? q.filedAt : fin[FILEDEF[id][1]]; return; }
  const data = preds(id).filter(l => l[4] !== 'kbw' && l[4] !== 'order');
  const ord = preds(id).filter(l => l[4] === 'order');
  const kbs = preds(id).filter(l => l[4] === 'kbw');
  const r = Math.max(0, ...data.map(l => doneAt(l[0])));
  ready[id] = r;
  let st = Math.max(r, ...ord.map(l => doneAt(l[0])), ...kbs.map(l => fin[l[0]]));
  if (id === '105') st = Math.max(...productIds.map(doneAt));
  if (s.skipped) { skipAt[id] = Math.max(r, ...ord.map(l => doneAt(l[0]))); return; }
  if (id === q.id) {
    q.try1 = [st, st + STORY.q.failDur];
    const r2 = Math.max(STORY.q.retryAt, q.try1[1]);
    start[id] = r2; fin[id] = r2 + s.dur; q.filedAt = fin[id];
    return;
  }
  start[id] = st; fin[id] = st + (s.dur || 0);
});
const r1 = x => Math.round(x * 10) / 10;
const END = Math.max(...Object.values(fin));

/* ---------- prompts ---------- */
let seed = 7; const rnd = (a, b) => { seed = (seed * 9301 + 49297) % 233280; return Math.round(a + (b - a) * seed / 233280); };
const toolName = id => ((S[id].settings || {}).Tool || 'tool');
const evId = id => {
  const t = S[id].type;
  if (t === 'tool/futurity') return `ev:tool:${id}:futurity:${toolName(id)}`;
  if (t === 'data/script') return `ev:tool:${id}:script`;
  if (t === 'data/verify-rows') return `ev:tool:${id}:verify`;
  if (t === 'flow/gate') return `ev:tool:${id}:gate`;
  return `ev:insight:${id}`;
};
const hdText = id => HD[id] || (S[id].type.startsWith('agent/') ? `Insight: ${S[id].title}, ` + (S[id].out || '').replace(/^[A-Za-z ]+: /, '') : S[id].out || S[id].title);
const hdChars = id => { const t = S[id].type; return t === 'research/deep' ? rnd(3900, 4200) : t === 'data/script' ? rnd(3600, 4150) : t === 'tool/futurity' ? rnd(3400, 4100) : t === 'data/verify-rows' ? rnd(600, 1100) : rnd(1800, 3500); };
const factsWired = s => (s.in && s.in.facts) ? s.in.facts.map(x => x.split('.')[0]) : [];
const factKeys = mid => { const m = S[mid]; const all = Object.keys(FACTS[m.facts]); return (m.only || all).map(k => m.facts + '.' + k); };
const factVal = key => { const [ns, k] = key.split('.'); return FACTS[ns][k]; };
const catalog = mids => {
  const keys = mids.flatMap(factKeys);
  const lines = keys.slice(0, 3).map(k => `{{fact:${k}}}: ${factVal(k)[1]}, reads '${factVal(k)[0]}'`);
  return [keys.length * 88 + rnd(40, 120), lines.join('\n') + (keys.length > 3 ? '\n…' : ''), keys];
};
const rules = n => ['Engine rules (5 blocks)', n, 3, ENGINE_RULES.join(' · ')];
const SUBMIT = { 'report/section': 'submit_section', 'agent/debate': 'submit_critique', 'agent/react': 'submit_insight', 'agent/conclude': 'submit_insight' };
const contract = t => ['Output contract', 89, 3, `When you are done, call the ${SUBMIT[t]} tool exactly once with your structured output.`];
const priorOut = {}; let soFar = 0;
WRITE_ORDER.forEach(id => { priorOut[id] = soFar; if (!S[id].skipped && !S[id].declined) soFar += rnd(1500, 2300); });

function partsOf(s) {
  const P = [];
  const fx = factsWired(s);
  const cat = fx.length ? catalog(fx) : null;
  const ins = s.in || {};
  if (s.type === 'report/section') {
    const role = 'You are Writer: ' + s.title + '. You write one section of a client-facing research report. ' + s.instr;
    P.push(['Role', role.length, 1, role], ['Task', 60 + s.title.length, 1, 'YOUR TASK: Write the section "' + s.title + '" from the insights and data below.']);
    if (cat) P.push(['Fact catalog', cat[0], 2, cat[1]]);
    P.push(rules(cat ? 2579 : 2024));
    (ins.insights || []).concat(ins.hard_data || []).forEach(x => { const id = x.split('.')[0]; P.push(['Hard data · ' + evId(id), hdChars(id), 2, hdText(id)]); });
    if ((ins.insights || []).some(x => S[x.split('.')[0]].type.startsWith('agent/'))) {
      const a = ins.insights[0].split('.')[0];
      P.push(['Claim catalog', rnd(1900, 2900), 2, `The findings behind the wired insights, each with an id: "ev:claim:${a}:0 · ${(S[a].out || '').replace(/^[A-Za-z ]+: "?/, '').slice(0, 90)}…"`]);
    }
    const first = WRITE_ORDER.find(w => priorOut[w] > 0 && WRITE_ORDER.indexOf(w) > 0);
    if (priorOut[s.id] > 0) P.push(['Report so far', priorOut[s.id], 2, 'Every section already written, in order: "' + (S['17'].out || '').replace(/^Paragraph: "/, '').slice(0, 110) + '…"']);
    P.push(contract(s.type));
    return [P, cat];
  }
  if (s.type === 'agent/debate') {
    const crit = (s.settings || {})['Critic role'];
    P.push(['Role', crit.length + 60, 1, 'You are the critic. ' + crit], ['Task', 118, 1, 'YOUR TASK: Attack the analysis below. Name each weak claim, say why it is weak and what evidence would fix it.']);
    (ins.insight || []).forEach(x => { const id = x.split('.')[0]; P.push(['Analysis under review · ' + evId(id), hdChars(id), 2, hdText(id)]); });
    (ins.hard_data || []).forEach(x => { const id = x.split('.')[0]; P.push(['Hard data · ' + evId(id), hdChars(id), 2, hdText(id)]); });
    P.push(rules(2024), contract(s.type));
    return [P, cat];
  }
  const role = 'You are ' + s.title + '. ' + s.role;
  P.push(['Role', role.length, 1, role], ['Task', 12 + s.goal.length, 1, 'YOUR TASK: ' + s.goal]);
  if (s.cols) P.push(['Output columns', 34 + s.cols.length, 1, 'Return rows with these columns: ' + s.cols + '.']);
  if (cat) P.push(['Fact catalog', cat[0], 2, cat[1]]);
  P.push(rules(cat ? 2579 : 2024));
  ['insights', 'hard_data', 'grounding'].forEach(port => (ins[port] || []).forEach(x => {
    const id = x.split('.')[0];
    P.push([(port === 'insights' ? 'Insight · ' : port === 'grounding' ? 'Grounding · ' : 'Hard data · ') + evId(id), hdChars(id), 2, hdText(id)]);
  }));
  P.push(contract(s.type));
  return [P, cat];
}

/* ---------- G, P, D ---------- */
const G = {}, P = {}, D = {};
const PARAMS = {};
const settingsOf = s => {
  if (s.type === 'report/section') return { Heading: s.title, 'Writing instructions': s.instr };
  if (s.type === 'agent/react') return { Role: s.role, Goal: s.goal, ...(s.cols ? { 'Output columns': s.cols } : {}), Tools: 'knowledgebase, web search, read web pages' };
  if (s.type === 'agent/conclude') return { Role: s.role, Goal: s.goal };
  if (s.type === 'data/mint-facts') return { Extractors: factKeys(s.id).length + ' facts' };
  return { ...(s.settings || {}) };
};
STEPS.forEach(s => {
  const g = { type: s.type, title: s.title, start: s.skipped ? null : r1(start[s.id] ?? 0), dur: s.skipped ? null : (s.dur ?? 0), settings: {} };
  if (s.params) { g.settings['Run inputs in settings'] = s.params; PARAMS[s.id] = s.params; }
  if (s.type === 'tool/futurity' && s.settings && s.settings.Tool) g.settings.Tool = s.settings.Tool;
  if (s.skipped) { g.skipped = true; g.note = s.note; g.skipAt = r1(skipAt[s.id]); }
  if (s.type === 'report/section') { g.ready = r1(ready[s.id] ?? 0); const o = preds(s.id).find(l => l[4] === 'order'); if (o) g.after = o[0]; }
  if (s.id === q.id) { g.firstTry = [r1(q.try1[0]), r1(q.try1[1])]; g.note = s.note; }
  const attempts = (s.attempts || []).map(([check, ex]) => ({ ok: false, check, ex }));
  if (isAI(s.id) && s.type !== 'research/deep') {
    const [parts, cat] = s.skipped ? [[], null] : partsOf(s);
    const chars = parts.reduce((a, p) => a + p[1], 0);
    const calls = s.skipped ? 0 : 1 + attempts.length + (s.type === 'agent/debate' ? 2 : 0);
    const tok = Math.round(chars / 3.7) * calls, ctok = s.skipped ? 0 : rnd(180, 900) * calls;
    Object.assign(g, s.skipped ? {} : { calls, tok, ctok, sys: chars, attempts });
    if (s.declined) { g.declined = true; g.note = s.note; }
    if (!s.skipped) P[s.id] = { type: s.type, title: s.title, dur: s.dur, calls, tok, ctok, settings: settingsOf(s), parts, attempts, out: s.out, ...(s.note ? { note: s.note } : {}), ...(s.declined ? { declined: true } : {}) };
    else g.settings = { ...g.settings, ...settingsOf(s) };
  } else if (s.type !== 'input/run-params') {
    const d = { type: s.type, title: s.title, dur: s.dur ?? 0, settings: settingsOf(s) };
    if (s.inside) d.inside = s.inside;
    if (s.type === 'data/mint-facts') d.out = factKeys(s.id).join(', ');
    else if (s.out) d.out = s.out;
    if (s.type === 'research/deep') d.inside = 'Runs the deep researcher with ' + RUN.model + '. Its prompts live inside the researcher, so the engine does not record them. It does record every page read: each becomes evidence and a knowledgebase document.';
    D[s.id] = d;
    if (s.note && !g.note) g.note = s.note;
  }
  G[s.id] = g;
});

Object.entries(FILEDEF).forEach(([f, [t, r]]) => { G[f] = { type: 'kb/file', title: t, settings: { Files: 'the pages and report of ' + S[r].title }, file: true }; });

/* ---------- hierarchy ---------- */
const PARENT = {};
STEPS.forEach(s => { if (s.block) PARENT[s.id] = s.block; else if (s.ws) PARENT[s.id] = s.ws; else if (s.id !== '1') PARENT[s.id] = 'report'; });
Object.values(BL).forEach(b => { PARENT[b.id] = b.ws; });
Object.keys(WS).forEach(w => { PARENT[w] = 'report'; });
Object.entries(FILEDEF).forEach(([f, d]) => { PARENT[f] = d[2]; });
const firstStart = id => BL[id] ? Math.min(...BL[id].steps.map(x => start[x] ?? skipAt[x] ?? 0)) : (start[id] ?? skipAt[id] ?? 0);
const CHAPTERS = {};
Object.values(WS).forEach(w => {
  const blocks = Object.values(BL).filter(b => b.ws === w.id).map(b => b.id);
  const prims = STEPS.filter(s => s.ws === w.id && !s.block).map(s => s.id);
  const files = Object.keys(FILEDEF).filter(f => FILEDEF[f][2] === w.id);
  const kids = [...blocks, ...prims].sort((a, b) => firstStart(a) - firstStart(b)).concat(files);
  const steps = kids.flatMap(k => BL[k] ? BL[k].steps : [k]);
  CHAPTERS[w.id] = { title: w.title, what: w.what, kids, kind: w.kind, steps, n: steps.length, skipped: steps.filter(x => S[x] && S[x].skipped).length };
});
const BLOCKS = {};
Object.values(BL).forEach(b => { BLOCKS[b.id] = { title: b.title, what: b.what, steps: b.steps, reuse: b.reuse, chapter: b.ws }; });
const stepsUnder = id => CHAPTERS[id] ? CHAPTERS[id].steps : BLOCKS[id] ? BLOCKS[id].steps : [id];

/* ---------- products ---------- */
const OUTPOS = {}; OUTLINE.forEach(([, ids], k) => ids.forEach((id, j) => { OUTPOS[id] = k * 100 + j; }));
const kindOfProduct = id => S[id].type === 'report/section' ? 'section' : 'figure';
const statusOf = id => S[id].declined ? 'declined' : S[id].skipped ? 'skipped' : 'ok';
const countStr = ids => {
  const sec = ids.filter(i => kindOfProduct(i) === 'section').length, fig = ids.length - sec;
  return [sec ? sec + (sec > 1 ? ' sections' : ' section') : '', fig ? fig + (fig > 1 ? ' figures' : ' figure') : ''].filter(Boolean).join(' · ');
};
const PRODUCTS = {};
[...Object.keys(CHAPTERS), ...Object.keys(BLOCKS)].forEach(box => {
  const ids = stepsUnder(box).filter(isProduct).sort((a, b) => OUTPOS[a] - OUTPOS[b]);
  PRODUCTS[box] = ids.map(i => [i, S[i].title, kindOfProduct(i), statusOf(i)]);
  PRODUCTS[box + ':count'] = countStr(ids);
});
const REPORT_OUTLINE = OUTLINE.map(([t, ids]) => [t, ids.map(i => [i, S[i].title])]);
const ORDER_CHAIN = WRITE_ORDER.slice(1).map((id, k) => [WRITE_ORDER[k], id]);

/* ---------- ports ---------- */
const OUT_TYPE = { result: 'Data', out: 'Data', pass: 'Data', picked: 'Data', dataset: 'Data', facts: 'Facts', insight: 'Findings', research: 'Findings', deposits: 'Filed', filed: 'Filed', section: 'Report part', figure: 'Report part', report: 'Report' };
const key = (src, sport) => `k${src}_${sport}`;
const portLabel = (src, sport) => {
  if (isFile(src)) return FILEDEF[src][0] + ' filed';
  if (sport === 'deposits') return 'Research filed: ' + S[src].title.replace(/^Deep research: /, '');
  if (S[src].type === 'flow/gate') { const v = preds(src)[0]; return title(v[0]) + ', if any'; }
  return S[src].title;
};
const IN_LABEL = { kb: 'knowledgebase', hard_data: 'hard data' };
const catType = (type, port) => { const c = (CATP[type] || []).find(p => p[0] === port); return c ? c[1] : 'Anything'; };
const outPortOf = id => S[id].type === 'report/section' ? 'section' : S[id].type.startsWith('viz/') ? 'figure' : null;
function primPorts(id, links) {
  if (isFile(id)) return [[['pages', 'pages and report', 'Filed']], [['filed', 'filed', 'Filed']]];
  const t = S[id].type, inP = new Map(), outP = new Map();
  links.filter(l => l[2] === id).forEach(l => { if (!inP.has(l[3])) inP.set(l[3], [l[3], IN_LABEL[l[3]] || l[3], l[3] === 'after' ? 'Section' : catType(t, l[3]), ...(l[4] === 'order' ? ['order'] : [])]); });
  links.filter(l => l[0] === id).forEach(l => { if (!outP.has(l[1])) outP.set(l[1], [l[1], l[1] === 'deposits' ? 'pages and report' : l[1], OUT_TYPE[l[1]] || 'Data']); });
  const op = outPortOf(id); if (op && !outP.has(op)) outP.set(op, [op, op, 'Report part']);
  const catOrder = (CATP[t] || []).map(p => p[0]).concat(['after']);
  const ins = [...inP.values()].sort((a, b) => catOrder.indexOf(a[0]) - catOrder.indexOf(b[0]));
  return [ins, [...outP.values()]];
}
const placeTitle = (id, here) => { const w = wsOf(id); return w && w !== here ? ' · ' + WS[w].title : ''; };

/* ---------- layout helpers ---------- */
function ranks(kids, edges) {
  const r = {}; kids.forEach(k => { r[k] = 0; });
  for (let it = 0; it < kids.length + 2; it++) edges.forEach(([a, b]) => { if (a in r && b in r && r[b] < r[a] + 1) r[b] = r[a] + 1; });
  return r;
}
const hPrim = (ins, outs) => 96 + 21 * Math.max(ins.length, outs.length);
const hBlock = (ins, outs, id) => 178 + 21 * Math.max(ins.length, outs.length) + (PRODUCTS[id] && PRODUCTS[id].length ? 20 : 0);

/* ---------- box levels ---------- */
function buildLevel(X) {
  const isW = !!CHAPTERS[X];
  const kids = isW ? CHAPTERS[X].kids : BLOCKS[X].steps;
  const members = new Set(isW ? CHAPTERS[X].steps : BLOCKS[X].steps);
  const childOf = id => { if (!members.has(id)) return null; if (!isW) return id; const b = S[id] && S[id].block; return b || id; };
  const isPrimChild = c => !BLOCKS[c];
  const links = LINKS;
  const internal = links.filter(l => members.has(l[0]) && members.has(l[2]) && childOf(l[0]) !== childOf(l[2]));
  const incoming = links.filter(l => !members.has(l[0]) && members.has(l[2]) && l[0] !== '1');
  const outgoing = links.filter(l => members.has(l[0]) && !members.has(l[2]));
  const hasInPred = c => internal.some(l => childOf(l[2]) === c && l[4] !== 'order');
  const hasInSucc = c => internal.some(l => childOf(l[0]) === c && l[4] !== 'order');
  const edges = [], seen = new Set();
  const addE = e => { const k = e.slice(0, 4).join('|'); if (seen.has(k)) return; seen.add(k); edges.push(e); };
  const binP = new Map(), boutP = new Map(), lt = new Map(), eo = new Map();
  // internal
  internal.forEach(l => {
    const a = childOf(l[0]), b = childOf(l[2]);
    addE([a, isPrimChild(a) ? l[1] : key(l[0], l[1]), b, isPrimChild(b) ? l[3] : key(l[0], l[1]), l[4]]);
  });
  // incoming
  incoming.forEach(l => {
    if (l[4] === 'order') return;
    const b = childOf(l[2]), k = key(l[0], l[1]);
    const lab = portLabel(l[0], l[1]), typ = isFile(l[0]) ? 'Filed' : OUT_TYPE[l[1]] || 'Data';
    const th = isPrimChild(b) ? l[3] : k;
    if (l[4] === 'kbw' || !hasInPred(b)) { binP.set(k, [k, lab + placeTitle(l[0], isW ? X : BLOCKS[X].chapter), typ]); addE(['bin', k, b, th, l[4]]); }
    else { lt.set(k, { side: 'top', what: lab, type: typ, from: WS[wsOf(l[0])].title, key: k, x: b }); addE(['lt:' + k, k, b, th, l[4]]); }
  });
  // outgoing
  outgoing.forEach(l => {
    if (l[4] === 'order') return;
    const a = childOf(l[0]), k = key(l[0], l[1]);
    const lab = portLabel(l[0], l[1]), typ = isFile(l[0]) ? 'Filed' : OUT_TYPE[l[1]] || 'Data';
    const sh = isPrimChild(a) ? l[1] : k;
    const dw = wsOf(l[2]);
    const where = dw && dw !== (isW ? X : BLOCKS[X].chapter) ? WS[dw].title : (S[l[2]] && S[l[2]].block && BLOCKS[S[l[2]].block] ? BLOCKS[S[l[2]].block].title : 'Report');
    if (hasInSucc(a)) { const o = eo.get(k) || { side: 'bottom', what: lab, type: typ, to: [], key: k, x: a }; if (!o.to.includes(where)) o.to.push(where); eo.set(k, o); addE([a, sh, 'eo:' + k, k, l[4]]); }
    else { boutP.set(k, [k, lab, typ]); addE([a, sh, 'bout', k, l[4]]); }
  });
  // params, products
  const pk = kids.filter(c => (BLOCKS[c] ? BLOCKS[c].steps : [c]).some(x => PARAMS[x]));
  if (pk.length) { binP.set('params', ['params', 'Run inputs', 'Run inputs']); pk.forEach(c => addE(['bin', 'params', c, isPrimChild(c) ? '__params' : 'params', 'param'])); }
  const prodKids = kids.filter(c => BLOCKS[c] ? PRODUCTS[c].length : isProduct(c));
  if (prodKids.length) { boutP.set('products', ['products', 'To the report', PRODUCTS[X + ':count']]); prodKids.forEach(c => addE([c, BLOCKS[c] ? 'products' : outPortOf(c), 'bout', 'products', 'prod'])); }
  // child ports
  const ports = {};
  kids.forEach(c => {
    if (!BLOCKS[c]) { ports[c] = primPorts(c, links); return; }
    const inB = new Set(BLOCKS[c].steps);
    const ins = new Map(), outs = new Map();
    links.filter(l => inB.has(l[2]) && !inB.has(l[0]) && l[0] !== '1').forEach(l => { const k = key(l[0], l[1]); if (l[4] === 'order' && !members.has(l[0])) return; if (!ins.has(k)) ins.set(k, [k, portLabel(l[0], l[1]), isFile(l[0]) ? 'Filed' : OUT_TYPE[l[1]] || 'Data', ...(l[4] === 'order' ? ['order'] : [])]); });
    links.filter(l => inB.has(l[0]) && !inB.has(l[2])).forEach(l => { const k = key(l[0], l[1]); if (l[4] === 'order' && !members.has(l[2])) return; if (!outs.has(k)) outs.set(k, [k, portLabel(l[0], l[1]), OUT_TYPE[l[1]] || 'Data', ...(l[4] === 'order' ? ['order'] : [])]); });
    if (BLOCKS[c].steps.some(x => PARAMS[x])) ins.set('params', ['params', 'Run inputs', 'Run inputs']);
    if (PRODUCTS[c].length) outs.set('products', ['products', 'To the report', PRODUCTS[c + ':count']]);
    ports[c] = [[...ins.values()], [...outs.values()]];
  });
  // layout
  const rk = ranks(kids, edges.filter(e => e[4] !== 'order' && kids.includes(e[0]) && kids.includes(e[2])).map(e => [e[0], e[2]]));
  const colW = isW ? 420 : 330, x0 = 370;
  const cols = {}; kids.forEach(c => { (cols[rk[c]] = cols[rk[c]] || []).push(c); });
  const pos = {}; let minY = 0, maxY = 0, maxX = 0;
  Object.entries(cols).forEach(([r, cs]) => {
    const hs = cs.map(c => BLOCKS[c] ? hBlock(ports[c][0], ports[c][1], c) : isFile(c) ? 110 : hPrim(ports[c][0], ports[c][1]));
    const tot = hs.reduce((a, b) => a + b, 0) + 40 * (cs.length - 1);
    let y = -tot / 2;
    cs.forEach((c, k) => { pos[c] = [x0 + r * colW, Math.round(y)]; minY = Math.min(minY, y); y += hs[k] + 40; maxY = Math.max(maxY, y - 40); });
    maxX = Math.max(maxX, x0 + r * colW);
  });
  const nodes = [];
  const binO = [...binP.values()].sort((a, b) => (a[0] === 'params') - (b[0] === 'params'));
  if (binO.length) nodes.push(['bin', 'io', 0, Math.round(-(60 + 21 * binO.length) / 2), [], binO]);
  kids.forEach(c => nodes.push([c, BLOCKS[c] ? 'block' : isFile(c) ? 'file' : 'prim', pos[c][0], pos[c][1], ports[c][0], ports[c][1]]));
  const boutI = [...boutP.values()].sort((a, b) => (a[0] === 'products') - (b[0] === 'products'));
  if (boutI.length) nodes.push(['bout', 'io', maxX + colW + (isW ? 0 : 36), Math.round(-(60 + 21 * boutI.length) / 2), boutI, []]);
  const spread = (m, y) => { const used = []; [...m.values()].sort((a, b) => pos[a.x][0] - pos[b.x][0]).forEach(h => { let x = pos[h.x][0]; while (used.some(u => Math.abs(u - x) < 180)) x += 180; used.push(x); const { x: _, ...meta } = h; nodes.push([(meta.side === 'top' ? 'lt:' : 'eo:') + h.key, 'hand', x, y, [], [], meta]); }); };
  spread(lt, Math.round(minY - 170));
  spread(eo, Math.round(maxY + 110));
  return { title: isW ? CHAPTERS[X].title : BLOCKS[X].title, nodes, edges };
}

/* ---------- cross-workstream wires ---------- */
const XW = {};
const wsChild = id => (S[id] && S[id].block) || id;
const wsInternal = w => LINKS.filter(l => wsOf(l[0]) === w && wsOf(l[2]) === w && wsChild(l[0]) !== wsChild(l[2]) && l[4] !== 'order');
LINKS.forEach(l => {
  const a = wsOf(l[0]), b = wsOf(l[2]);
  if (!a || !b || a === b || l[4] === 'order') return;
  const sa = wsInternal(a).some(m => wsChild(m[0]) === wsChild(l[0])) ? 'early' : 'out';
  const sb = l[4] === 'kbw' ? 'in' : wsInternal(b).some(m => wsChild(m[2]) === wsChild(l[2]) && m[4] !== 'kbw') ? 'late' : 'in';
  const id = `${a}.${sa}>${b}.${sb}`;
  const v = XW[id] = XW[id] || { id, a, b, sa, sb, items: [] };
  if (sa === 'early' || sb === 'late') v.hand = true;
  v.items.push({ from: l[0], port: l[1], to: l[2], tport: l[3], what: portLabel(l[0], l[1]), type: isFile(l[0]) ? 'Filed' : OUT_TYPE[l[1]] || 'Data', via: [wsChild(l[0]), wsChild(l[2])] });
});

/* ---------- report level ---------- */
const RPOS = { in: [0, 60], c_ground: [340, -140], c_eng: [900, -640], c_sci: [900, -20], c_biz: [900, 640], c_syn: [1420, -200], report: [1900, -260] };
const repEdges = [], sides = {}; Object.keys(WS).forEach(w => { sides[w] = { top: false, bottom: false, out: false }; });
Object.values(XW).forEach(v => {
  const style = v.sb === 'in' ? 'xw in' : 'xw late';
  if (!v.hand) { repEdges.push([v.a, 'out', v.b, 'in', style, v.id]); sides[v.a].out = true; return; }
  const down = RPOS[v.a][1] < RPOS[v.b][1];
  repEdges.push([v.a, down ? 'h-s-bottom' : 'h-s-top', v.b, down ? 'h-t-top' : 'h-t-bottom', style, v.id]);
  sides[v.a][down ? 'bottom' : 'top'] = true; sides[v.b][down ? 'top' : 'bottom'] = true;
});
Object.keys(WS).forEach(w => { if (CHAPTERS[w].steps.some(x => PARAMS[x])) repEdges.push(['in', 'params', w, 'in', 'param', '']); });
Object.keys(WS).forEach(w => { if (PRODUCTS[w].length) repEdges.push([w, 'products', 'report', 'products', 'prod', '']); });
const H = [['hand', 'Handoff', 'hand']];
const repNodes = [['in', 'io', ...RPOS.in, [], [['params', 'lab, years, papers, question', 'Run inputs']]]];
Object.keys(WS).forEach(w => repNodes.push([w, 'chapter', ...RPOS[w], [['in', 'Inputs', '']],
  [...(sides[w].out ? [['out', 'Outputs', '']] : []), ...(PRODUCTS[w].length ? [['products', 'To the report', PRODUCTS[w + ':count']]] : [])],
  sides[w].top ? H : [], sides[w].bottom ? H : []]));
repNodes.push(['report', 'report', ...RPOS.report, [['products', 'Sections and figures', 'Report part']], []]);

/* ---------- every step ---------- */
function buildAll() {
  const lanes = [...Object.keys(WS), 'rep'];
  const laneOf = id => wsOf(id) || 'rep';
  const ids = order.filter(id => id !== '1');
  const rk = {}; ids.forEach(id => { rk[id] = Math.max(0, ...preds(id).filter(l => l[4] !== 'order' && l[0] !== '1').map(l => rk[l[0]] + 1)); });
  if (rk['105'] != null) { rk['105'] = 0; rk['106'] = 1; }
  const nodes = [], laneRows = [];
  let y = 0; const W = (Math.max(...Object.values(rk)) + 1) * 254 + 60;
  lanes.forEach(L => {
    const mine = ids.filter(id => laneOf(id) === L);
    const byR = {}; mine.forEach(id => { (byR[rk[id]] = byR[rk[id]] || []).push(id); });
    const rows = Math.max(1, ...Object.values(byR).map(a => a.length));
    Object.entries(byR).forEach(([r, a]) => a.forEach((id, k) => nodes.push([id, 'mini', 40 + r * 254, y + 70 + k * 58, [], []])));
    const h = 70 + rows * 58 + 14;
    laneRows.push([L, 0, y, W, h]); y += h + 26;
  });
  const edges = LINKS.filter(l => l[0] !== '1').map(l => [l[0], 'o', l[2], 'i', l[4] === 'order' ? 'chain' : l[4]]);
  return { title: 'Every step', nodes, edges, lanes: laneRows };
}

const LEVELS = { report: { title: RUN.pipeline, nodes: repNodes, edges: repEdges } };
Object.keys(WS).forEach(w => { LEVELS[w] = buildLevel(w); });
Object.keys(BLOCKS).forEach(b => { LEVELS[b] = buildLevel(b); });
LEVELS.all = buildAll();

/* ---------- knowledgebase ---------- */
const NEEDS = {}; STEPS.forEach(s => { if (s.kb && !s.skipped) NEEDS[s.id] = s.kb; });
const FILES = {};
Object.entries(FILEDEF).forEach(([f, [t, r, w]]) => { FILES[f] = { title: t, research: r, ws: w, readers: Object.keys(NEEDS).filter(x => NEEDS[x].includes(f)) }; });
const research = {};
Object.entries(FILEDEF).forEach(([, [, r, w]]) => { research[r] = { title: S[r].title, ws: w, start: r1(start[r]), fin: r1(fin[r]), failed: r === q.id ? [r1(q.try1[0]), r1(q.try1[1])] : null }; });
const readers = Object.keys(NEEDS).map(x => [x, wsOf(x), r1(start[x])]).sort((a, b) => a[2] - b[2]);
const DEPKIND = t => t === 'research/deep' ? 'research' : t === 'report/section' ? 'section' : t.startsWith('agent/') ? 'ai' : t === 'report/publish' ? 'report' : ['tool/futurity', 'data/script', 'data/mint-facts', 'data/verify-rows'].includes(t) ? 'data' : null;
const deposits = STEPS.filter(s => !s.skipped && !s.declined && DEPKIND(s.type)).map(s => [r1(fin[s.id]), s.id, DEPKIND(s.type)]).sort((a, b) => a[0] - b[0]);
const down = {};
Object.keys(NEEDS).forEach(rd => {
  const out = new Set(), stack = [rd];
  while (stack.length) { const x = stack.pop(); succs(x).filter(l => l[4] === '').forEach(l => { if (!out.has(l[2])) { out.add(l[2]); stack.push(l[2]); } }); }
  down[rd] = [...out].filter(x => S[x] && S[x].type === 'report/section').sort();
});
const KBR = { files: FILES, needs: NEEDS, readers, research, deposits, down };
const TL = { segs: [[0, r1(END)]], end: r1(END) };

/* ---------- summary numbers the views quote ---------- */
const working = STEPS.filter(s => s.id !== '1' && !s.skipped).length;
const writers = WRITE_ORDER.length;
const writeSec = WRITE_ORDER.reduce((a, id) => a + (S[id].skipped ? 0 : S[id].dur || 0), 0);
const RUNINFO = { ...RUN, steps: STEPS.filter(s => s.id !== '1').length, working, files: Object.keys(FILEDEF).length, writers,
  writeMin: Math.round(writeSec / 60), workMin: Math.round(END / 60), qFailAt: r1(q.try1[1]), qFiledAt: r1(q.filedAt) };

/* ---------- steering ---------- */
const staleAfter = changed => {
  const out = new Set(), stack = [...changed];
  while (stack.length) { const x = stack.pop(); succs(x).filter(l => l[4] === '').forEach(l => { if (!changed.includes(l[2]) && !out.has(l[2]) && S[l[2]]) { out.add(l[2]); stack.push(l[2]); } }); }
  return [...out].sort((a, b) => (start[a] ?? 0) - (start[b] ?? 0));
};
const STEER = {
  rerun: { ...STEER_SRC.rerun, steps: BLOCKS[STEER_SRC.rerun.block].steps, stale: staleAfter(BLOCKS[STEER_SRC.rerun.block].steps) },
  rewrite: { ...STEER_SRC.rewrite, part: ['Your instruction', STEER_SRC.rewrite.instruction.length + 14, 1, 'INSTRUCTION: ' + STEER_SRC.rewrite.instruction], stale: staleAfter([STEER_SRC.rewrite.step]) },
};
// Steps the first pass skipped send their prompts in the rerun: build those prompts' parts too.
STEER.rerun.result = Object.fromEntries(Object.entries(STEER.rerun.result).map(([id, r]) => {
  if (!isAI(id) || !S[id].skipped) return [id, r];
  const [parts] = partsOf({ ...S[id], skipped: false });
  const chars = parts.reduce((a, p) => a + p[1], 0);
  return [id, { ...r, parts, settings: settingsOf(S[id]), tok: Math.round(chars / 3.7) * (r.calls || 1), sys: chars }];
}));

/* ---------- checks ---------- */
const problems = [];
LINKS.forEach(l => { if (!S[l[0]] && !isFile(l[0])) problems.push('link from unknown ' + l[0]); if (!S[l[2]] && !isFile(l[2])) problems.push('link to unknown ' + l[2]); });
Object.entries(LEVELS).forEach(([lv, L]) => {
  const ids = new Set(L.nodes.map(n => n[0]));
  L.edges.forEach(e => { if (!ids.has(e[0]) || !ids.has(e[2])) problems.push(`${lv}: edge ${e[0]} → ${e[2]} has a missing node`); });
  if (lv === 'all' || lv === 'report') return;
  const pmap = Object.fromEntries(L.nodes.map(n => [n[0], n]));
  L.edges.forEach(e => {
    const s = pmap[e[0]], t = pmap[e[2]]; if (!s || !t) return;
    const outs = s[1] === 'hand' ? [s[6].key] : s[5].map(p => p[0]);
    const ins = t[1] === 'hand' ? [t[6].key] : t[4].map(p => p[0]).concat(t[1] === 'prim' && e[3] === '__params' ? ['__params'] : []);
    if (!outs.includes(e[1])) problems.push(`${lv}: ${e[0]} has no output port ${e[1]}`);
    if (!ins.includes(e[3])) problems.push(`${lv}: ${e[2]} has no input port ${e[3]}`);
  });
});
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }

/* ---------- write ---------- */
const J = x => JSON.stringify(x);
const out = `// Generated by scripts/engine-run/build-engine-run.mjs from smr-run.source.mjs. Do not edit by hand.
// A made-up run for the carlton.dev Engine demo: every name, number and text is invented.
export const _meta = { synthetic: true, demo: 'engine' };
export const RUN = ${J(RUNINFO)};
export const STORY = ${J(STORY)};
export const STEER = ${J(STEER)};
export const FACTS = ${J(FACTS)};
export const CATP = ${J(CATP)};
export const KIND = ${J(KIND)};
export const ENGINE_RULES = ${J(ENGINE_RULES)};
export const P = ${J(P)};
export const D = ${J(D)};
export const G = ${J(G)};
export const LEVELS = ${J(LEVELS)};
export const BLOCKS = ${J(BLOCKS)};
export const CHAPTERS = ${J(CHAPTERS)};
export const REPORT_OUTLINE = ${J(REPORT_OUTLINE)};
export const PARENT = ${J(PARENT)};
export const ORDER_CHAIN = ${J(ORDER_CHAIN)};
export const LINKS_ALL = ${J(LINKS)};
export const PARAMS = ${J(PARAMS)};
export const PRODUCTS = ${J(PRODUCTS)};
export const XW = ${J(XW)};
export const KBR = ${J(KBR)};
export const TL = ${J(TL)};
`;
writeFileSync(OUT, out);
console.log(`${OUT}: ${RUNINFO.steps} steps (${working} ran), ${writers} writers, ${(out.length / 1024).toFixed(0)} KB, ends ${(END / 60).toFixed(1)} min, writing ${RUNINFO.writeMin} min; question research failed ${q.try1[1]} s, filed ${q.filedAt} s`);
