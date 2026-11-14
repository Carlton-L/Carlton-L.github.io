// The replay of the made-up run (src/data/demos/engine/). Same return shape as the Engine Blocks
// prototype's simulate(); this version handles the recorded retry, "go on without it", the wait
// limit and "Go on and flag". With no retry and no time limit, the searchers stay paused for good.
import { G, KBR, LINKS_ALL, STORY } from '../../../../data/demos/engine/smr-run.js';

const FILES = KBR.files, NEEDS = KBR.needs;
const isFile = (id) => !!FILES[id];

export /* Replay for the made-up run. Replaces the prototype's simulate(), which was fitted to the real run's
   17-hour stall. Same return shape. Start times are worked out from the wiring and the durations alone. */
function simulate(pol) {
  const Sq = STORY.q, QID = Sq.id;
  const st = {}, fn = {}, skipAt = {}, paused = {}, without = {}, q = {};
  const PR = {}; LINKS_ALL.forEach(l => { (PR[l[2]] = PR[l[2]] || []).push(l); });
  const fileT = f => f === 'kb_q' ? q.filedAt : fn[FILES[f].research];
  // A failed research job that nobody retries counts as settled when the run goes on without it.
  const doneT = id => isFile(id) ? fileT(id) : id === QID && !q.byRetry ? q.resolve : id in fn ? fn[id] : id in skipAt ? skipAt[id] : 0;
  const order = [], seen = new Set();
  const visit = id => { if (seen.has(id)) return; seen.add(id); (PR[id] || []).forEach(l => visit(l[0])); order.push(id); };
  Object.keys(G).forEach(visit);
  const prods = Object.keys(G).filter(x => ['report/section', 'viz/table', 'viz/chart'].includes(G[x].type));
  order.forEach(i => {
    if (isFile(i)) return;
    const g = G[i]; if (!g || i === '1') { fn[i] = 0; return; }
    const ls = PR[i] || [];
    const ready = Math.max(0, ...ls.filter(l => l[4] === '').map(l => doneT(l[0])));
    let s = Math.max(ready, ...ls.filter(l => l[4] === 'order').map(l => doneT(l[0])));
    const fromQ = ls.filter(l => l[4] === '' && l[0] === QID);
    const lost = fromQ.length && !q.byRetry;
    if (g.skipped || (lost && fromQ.length === ls.filter(l => l[4] === '').length)) { skipAt[i] = s; return; }
    if (lost) without[i] = true;
    if (i === QID) {
      const a = pol.action;
      q.try1 = [ready, ready + Sq.failDur]; q.failAt = q.try1[1]; q.byRetry = !!(a && a.kind === 'retry');
      const r2 = q.byRetry ? Math.max(a.at, q.failAt) : Infinity;
      q.run2 = [r2, r2 + g.dur]; q.filedAt = q.run2[1];
      q.resolve = pol.policy === 'flag' ? q.failAt : q.byRetry ? q.filedAt : a && a.kind === 'continue' ? Math.max(a.at, q.failAt) : q.failAt + pol.wait;
      st[i] = r2; fn[i] = q.filedAt; return;
    }
    const needs = NEEDS[i] || [];
    needs.filter(f => f !== 'kb_q').forEach(f => { s = Math.max(s, fileT(f)); });
    if (needs.includes('kb_q')) {
      const from = Math.max(s, q.failAt), s2 = Math.max(s, Math.min(q.resolve, q.filedAt));
      if (pol.policy === 'pause' && s2 > from) paused[i] = [from, s2];
      without[i] = without[i] || s2 < q.filedAt - 0.5; s = s2;
    }
    if (i === '105') s = Math.max(s, ...prods.map(doneT));
    st[i] = s; fn[i] = s + (g.dur || 0);
  });
  Object.keys(without).forEach(i => { if (!isFinite(st[i])) without[i] = false; });
  const flagged = new Set();
  Object.entries(without).forEach(([r, w]) => { if (w) (KBR.down[r] || []).forEach(p => flagged.add(p)); });
  const deps = KBR.deposits.map(([, k, kind]) => [fn[k], k, kind]).filter(d => isFinite(d[0])).sort((a, b) => a[0] - b[0]);
  const end = Math.max(...Object.values(fn).filter(isFinite), q.failAt);
  return { start: st, fin: fn, skipAt, paused, without, flagged, q, deps, segs: [[0, end]], end, shift58: 0 };
}
