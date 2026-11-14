/**
 * fast-lab-builder.js: the scripted run for the Lab Builder demo (FastLabBuilderDemo.jsx).
 *
 * Synthetic. The theme, answers, draft, search terms, candidates and board are invented for the
 * demo; no lab, team or client from FAST appears here. The behavior it drives (one question at a
 * time, a follow-up only when it changes the draft, a guessed field marked as a placeholder, picks
 * only from database results, revisions that say what changed) is the product's. Copy for the
 * questions and waits follows the accepted prototype, docs/prototypes/lab-builder-demo-v2.html.
 */

export const _meta = { synthetic: true, demo: 'fastLabBuilder' };

/** Intake: one question per screen. `def` is what the autoplay types. */
export const QUESTIONS = [
  { key: 'theme', label: 'Theme', q: 'What should this lab be about?', hint: 'The domain, in one line. Lab Builder names the lab from it.', kind: 'input', ph: 'e.g. Long-duration energy storage for rural grids', def: 'Long-duration energy storage for rural grids' },
  { key: 'goals', label: 'Goals', q: 'What do you want the lab to help you do?', hint: 'Your goal or goals, in your own words. Rough is fine.', kind: 'textarea', ph: 'Your goals…', def: 'Find storage that a co-op can afford instead of diesel backup, and work out what it takes to roll it out across a region.' },
  { key: 'broken', label: 'What is broken', q: 'What is broken today?', hint: 'The problem behind your goals. If you are not sure, Lab Builder drafts one and marks it for you to check.', kind: 'textarea', skip: 'I’m not sure yet', ph: 'The problem…', def: 'Rural co-ops run diesel generators when the grid drops, and the fuel costs more than the power.' },
  { key: 'who', label: 'For whom', q: 'Who has this problem, and roughly how many?', hint: 'A group and a rough number.', kind: 'input', skip: 'I’m not sure yet', ph: 'e.g. About 2,000 electricity co-operatives', def: '' },
  { key: 'where', label: 'Where', q: 'Where does this matter most?', hint: 'Optional. Pick as many places as you like.', kind: 'regions', skip: 'Skip', options: ['Sub-Saharan Africa', 'South Asia', 'Southeast Asia', 'Latin America'], def: ['Sub-Saharan Africa', 'South Asia'] },
];

/** The one follow-up Lab Builder asks in this run. */
export const FOLLOW_UP = { key: 'fu', label: 'Follow-up', q: 'For “roll it out across a region”, how far out should the plan look?', hint: 'Pick any that fit, add your own words, or both.', options: ['By 2030', 'By 2035', 'By 2040'], def: ['By 2035'] };

/** The draft, field by field, with the answers each part came from. `guess` = drafted for you to check. */
export const LAB = {
  name: { t: 'Long-duration storage for rural co-ops', src: ['theme'] },
  desc: { t: 'Which long-duration storage a rural co-op can afford instead of diesel backup, and what it takes to roll it out across a region.', src: ['theme', 'goals'] },
  goals: [
    {
      name: { t: 'Affordable storage to replace diesel backup', src: ['goals'] },
      desc: { t: 'A shortlist of storage options a co-op board can buy, costing less per kWh than diesel.', src: ['goals'] },
      problem: { t: 'Co-ops burn diesel when the grid drops, and the fuel costs more than the power.', src: ['broken'] },
      who: { t: 'Rural co-op members · about 500,000 people', src: ['who'], guess: true },
      where: { t: 'Sub-Saharan Africa, South Asia', src: ['where'] },
      horizon: { t: '2035', src: ['fu'] },
    },
    {
      name: { t: 'A regional rollout plan for co-op storage', src: ['goals'] },
      desc: { t: 'Know what financing, skills and suppliers a region needs before co-ops install storage at scale.', src: ['goals'] },
      problem: { t: 'No region has a plan for paying for and installing storage across many small co-ops.', src: ['broken'] },
      who: { t: 'Rural co-op members · about 500,000 people', src: ['who'], guess: true },
      where: { t: 'Sub-Saharan Africa, South Asia', src: ['where'] },
      horizon: { t: '2035', src: ['fu'] },
    },
  ],
};

/** Draft narration: each line, the answers it lights up, the fields it adds. */
export const DRAFT_STEPS = [
  { line: 'Naming the lab from your theme', src: ['theme'], show: ['name', 'desc'] },
  { line: 'Turning your goals into 2 goals', src: ['goals'], show: ['g.name', 'g.desc'] },
  { line: 'Writing a problem for each goal from what is broken', src: ['broken'], show: ['g.problem'] },
  { line: 'No group given: drafting one for you to check', src: ['who'], show: ['g.who'] },
  { line: 'Placing the goals in Sub-Saharan Africa and South Asia', src: ['where'], show: ['g.where'] },
  { line: 'Horizon from your follow-up: 2035', src: ['fu'], show: ['g.horizon'] },
];

/** Subject search per goal: terms, candidates from the database, picks, and one invented pick that gets dropped. */
export const SUBJECT_RUNS = [
  {
    terms: ['sodium-ion battery', 'flow battery', 'iron-air battery', 'compressed air storage', 'thermal storage', 'second-life batteries'],
    total: 38,
    picks: ['Iron-air battery', 'Sodium-ion battery', 'Zinc-bromine flow battery', 'Vanadium redox flow battery', 'Compressed air energy storage', 'Gravity energy storage', 'Thermal energy storage', 'Green hydrogen', 'Second-life EV batteries'],
    rest: ['Battery recycling', 'Battery management system', 'Molten salt storage', 'Solid-state battery', 'Supercapacitor', 'Grid inertia', 'Hydropower'],
    fake: 'Solid-state grid battery',
  },
  {
    terms: ['microgrid', 'demand response', 'pay-as-you-go energy', 'energy cooperative', 'rural electrification'],
    total: 24,
    picks: ['Microgrid controller', 'Demand response', 'Virtual power plant', 'Fuel cell backup power', 'Pay-as-you-go energy', 'Energy cooperative', 'Rural electrification'],
    rest: ['Smart meter', 'Mobile money', 'Diesel generator', 'Off-grid solar', 'Community solar', 'Mini-grid tariff'],
  },
];

/** The board after sorting: categories, then the Uncategorized strip. */
export const BOARD = [
  { name: 'Battery chemistry', subs: ['Iron-air battery', 'Sodium-ion battery', 'Zinc-bromine flow battery', 'Vanadium redox flow battery'] },
  { name: 'Mechanical & thermal storage', subs: ['Compressed air energy storage', 'Gravity energy storage', 'Thermal energy storage'] },
  { name: 'Microgrids & control', subs: ['Microgrid controller', 'Demand response', 'Virtual power plant'] },
  { name: 'Hydrogen', subs: ['Green hydrogen', 'Fuel cell backup power'] },
  { name: 'Financing & rollout', subs: ['Pay-as-you-go energy', 'Energy cooperative', 'Rural electrification'] },
];
export const UNCATEGORIZED = ['Second-life EV batteries'];

export const cloneBoard = (b) => b.map((c) => ({ name: c.name, subs: [...c.subs] }));

/**
 * The three requests the scripted model knows. `lines(board)` is the narration, `apply(board)` the
 * new board. Each checks the category still exists, so asking twice says so instead of inventing.
 */
export const REQUESTS = [
  {
    text: 'Drop the hydrogen category and find five more on storage.',
    lines: (b) => (b.some((c) => c.name === 'Hydrogen')
      ? ['Reading your request', 'Removing Hydrogen and its 2 subjects', 'Searching for more on storage: 19 candidates, picked 5', 'Placing them in Battery chemistry and Mechanical & thermal storage']
      : ['Reading your request', 'There is no Hydrogen category on the board']),
    apply(b) {
      if (!b.some((c) => c.name === 'Hydrogen')) return cloneBoard(b);
      const out = cloneBoard(b).filter((c) => c.name !== 'Hydrogen');
      out.find((c) => c.name === 'Battery chemistry')?.subs.push('Lithium iron phosphate battery', 'Sand battery');
      out.find((c) => c.name === 'Mechanical & thermal storage')?.subs.push('Pumped hydro storage', 'Liquid air energy storage', 'Flywheel energy storage');
      return out;
    },
  },
  {
    text: 'Split Microgrids & control into hardware and software.',
    lines: (b) => (b.some((c) => c.name === 'Microgrids & control')
      ? ['Reading your request', 'Splitting Microgrids & control into Microgrid hardware and Grid software']
      : ['Reading your request', 'There is no Microgrids & control category on the board']),
    apply(b) {
      const out = cloneBoard(b);
      const i = out.findIndex((c) => c.name === 'Microgrids & control');
      if (i < 0) return out;
      const subs = out[i].subs;
      out.splice(i, 1,
        { name: 'Microgrid hardware', subs: subs.filter((s) => s === 'Microgrid controller') },
        { name: 'Grid software', subs: subs.filter((s) => s !== 'Microgrid controller') });
      return out;
    },
  },
  {
    text: 'Rename Financing & rollout to Paying for it.',
    lines: (b) => (b.some((c) => c.name === 'Financing & rollout')
      ? ['Reading your request', 'Renaming Financing & rollout to Paying for it']
      : ['Reading your request', 'There is no Financing & rollout category on the board']),
    apply(b) {
      return cloneBoard(b).map((c) => (c.name === 'Financing & rollout' ? { name: 'Paying for it', subs: c.subs } : c));
    },
  },
];
