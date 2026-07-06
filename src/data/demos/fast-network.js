/**
 * fast-network.js — knowledge-network datasets for the FAST graph demos.
 *
 * SHAPE CONTRACT (matches the product's /graphs/simple response, the exact shape
 * FAST's NetworkGraph consumes):
 *
 *   { meta: { label, type, summary, indices|null },
 *     nodes: [ { id, label, type, size?, ent_url?, date?, to? } ],
 *     links: [ { source, target, value? } ] }
 *
 *   type ∈ Subject | Organization | Press | Patent | Paper | Book
 *   nodes[0] is the focus entity of the page. meta.type 'Subject' renders as a
 *   SUBJECT GRAPH; any source type renders as a SOURCE SNAPSHOT. meta.indices
 *   null = the product's N/A state (indices not yet computed for the subject);
 *   when present it may carry `labels` = the product's descriptor sub-labels.
 *
 *   TRAVERSAL: any node carrying `to: '<key in NETWORKS>'` is a snapshot the
 *   user can walk to — the demo rings it, shows the product's "Go to …" pill,
 *   and swaps the active dataset.
 *
 * CONTENT: Carlton's real "Interstellar Propulsion Lab" (sanitized lab export,
 * 2025-11). The hero subject is DIGITAL TWIN, whose graph below is SAMPLED FROM
 * A REAL /graphs/simple EXPORT for fsid_digital_twin (1,947 nodes / 7,170 links
 * on page 1, trimmed to ~35 representative nodes): every label, type, year and
 * URL in it is real product data. One node is an injected traversal anchor
 * (`injected: true`) so the demo can walk to a lab-mate subject; the source
 * snapshot is the field's founding paper, wired from real citation edges.
 * The solar_sail and nuclear_pulse_propulsion graphs are synthetic (lab
 * subjects with invented example.org sources), matching the lab's board.
 *
 * REAL DROP-IN PATH (Carlton): save further sanitized /graphs/simple exports
 * (same shape, plus a `meta` block) to  src/data/demos/fast/graphs/<key>.json
 * — the glob below picks them up automatically.
 */

/* ── DIGITAL TWIN — sampled from the real graph export ── */
const digitalTwin = {
  meta: {
    label: 'digital twin',
    type: 'Subject',
    summary:
      'A virtual, dynamic model of a physical object, system, or process, connected via real-time data: simulation and analytics kept in sync with the physical counterpart.',
    /* real values + the product's real descriptor sub-labels (live app, 2026-07-06) */
    indices: {
      hr: 6.0,
      ws: 4.0,
      tt: 7.0,
      labels: {
        hr: 'Proven Prototypes, Growing Adoption',
        ws: 'Moderate Patent Coverage',
        tt: 'Fast Transfer',
      },
    },
  },
  nodes: [
    { id: 5360246, label: 'digital twin', type: 'Subject', size: 6 },
    /* injected traversal anchor (lab-mate subject) — see header note */
    { id: 'anchor-solar-sail', label: 'solar sail', type: 'Subject', size: 2, to: 'solar_sail', injected: true },
    /* real secondary subjects from the export */
    { id: 4482703, label: 'simulation', type: 'Subject', size: 2 },
    { id: 6368958, label: 'rocket', type: 'Subject', size: 2 },
    { id: 22183917, label: 'fusion', type: 'Subject', size: 2 },
    { id: 15924081, label: 'forecasting', type: 'Subject', size: 2 },
    { id: 4720902, label: 'real-time', type: 'Subject', size: 1 },
    { id: 1574435, label: 'internet of things', type: 'Subject', size: 2 },
    { id: 4482522, label: 'artificial intelligence', type: 'Subject', size: 2 },
    { id: 8978244, label: 'machine learning', type: 'Subject', size: 2 },
    { id: 264282492, label: 'predictive maintenance', type: 'Subject', size: 2 },
    { id: 154208, label: 'metaverse', type: 'Subject', size: 1 },
    /* real papers */
    { id: 2667196, label: 'Digital Twin: Mitigating Unpredictable, Undesirable Emergent Behavior in Complex Systems', type: 'Paper', size: 3, date: '2017', to: 'paper_dt_emergent' },
    { id: 151912885, label: 'Rocket Engine Digital Twin – Modeling and Simulation Benefits', type: 'Paper', size: 2, date: '2019', ent_url: 'https://www.semanticscholar.org/paper/6328f47ccf87efd7c739f1e730eb6e6db664c6a7' },
    { id: 117612487, label: 'Digital twin-driven product design, manufacturing and service with big data', type: 'Paper', size: 2, date: '2017', ent_url: 'https://www.semanticscholar.org/paper/1597449a7f64b6bd24639b4deab96c8a8c184177' },
    { id: 116500198, label: 'Digital Twin Shop-Floor: A New Shop-Floor Paradigm Towards Smart Manufacturing', type: 'Paper', size: 2, date: '2017', ent_url: 'https://www.semanticscholar.org/paper/8b77cd55a39c4c8c87f8a6a6572078e247630829' },
    { id: 21963359, label: 'Towards a Healthcare Digital Twin', type: 'Paper', size: 1, date: '2019', ent_url: 'https://www.semanticscholar.org/paper/fd6ce1184ad9fd72f4853cda3f755a8e835e94b6' },
    { id: 154553046, label: 'Aerodynamic Data Fusion Towards the Digital Twin Paradigm', type: 'Paper', size: 1, date: '2019', ent_url: 'https://www.semanticscholar.org/paper/4ffd4493f47c40ed2a3bc27d8fdafe9c9ec82bc1' },
    { id: 169069653, label: 'Demonstration of an Airframe Digital Twin Framework Using a CF-188 Full-Scale Component Test', type: 'Paper', size: 1, date: '2019', ent_url: 'https://www.semanticscholar.org/paper/3331d3eb5cf5296f6a82730af8de0534bd17b294' },
    { id: 300799626, label: 'A review of the uncertainty representation in the digital twin context', type: 'Paper', size: 1, date: '2019', ent_url: 'https://www.semanticscholar.org/paper/906155e6aea8393e0b9df04043dd4cbd9cc39731' },
    /* real patents */
    { id: 383687636, label: 'Method and device for establishing digital twin model of spacecraft launching field', type: 'Patent', size: 2, date: '2023', ent_url: 'https://patents.google.com/patent/CN115795699B/en' },
    { id: 70921077, label: 'Unmanned aerial vehicle digital twin modeling method based on real-time data driving', type: 'Patent', size: 1, date: '2023', ent_url: 'https://patents.google.com/patent/CN116150886A/en' },
    { id: 21283655, label: 'Digital twin for vehicle risk evaluation', type: 'Patent', size: 1, date: '2018', ent_url: 'https://patents.google.com/patent/US20190384870A1/en' },
    { id: 20266261, label: 'Digital twin for an electronic control module', type: 'Patent', size: 1, date: '2020', ent_url: 'https://patents.google.com/patent/WO2021016250A1/en' },
    { id: 4967419, label: 'Merged reality system and method', type: 'Patent', size: 1, date: '2020', ent_url: 'https://patents.google.com/patent/US11202036B2/en' },
    /* real press */
    { id: 265798665, label: 'Commonwealth Fusion Systems announces collaboration with Nvidia and Siemens', type: 'Press', size: 1, date: '2026', ent_url: 'https://www.marketscreener.com/news/commonwealth-fusion-systems-announces-collaboration-with-nvidia-and-siemens-ce7e59dfdd81fe24' },
    { id: 265798708, label: "Scientists Create Earth's Most Accurate Digital Twin To Date", type: 'Press', size: 1, date: '2025', ent_url: 'https://www.ndtv.com/science/scientists-create-earths-most-accurate-digital-twin-to-date-could-revolutionise-climate-modelling-9623897' },
    { id: 239690616, label: 'Slingshot lands $25.2M contract for digital space twin', type: 'Press', size: 1, date: '2022', ent_url: 'https://venturebeat.com/2022/04/01/slingshot-lands-25-2m-contract-for-digital-space-twin/' },
    { id: 265798714, label: "Vatican and Microsoft create AI-generated St. Peter's Basilica", type: 'Press', size: 1, date: '2024', ent_url: 'https://apnews.com/article/vatican-microsoft-basilica-artificial-intelligence-c37d066dc7455ffacece2457c4f8e1a1' },
    /* real books */
    { id: 115820989, label: 'Virtual You', type: 'Book', size: 1, date: '2023', ent_url: 'http://books.google.es/books?id=wvuTEAAAQBAJ' },
    { id: 16152514, label: 'The Digital Twin', type: 'Book', size: 1, date: '2023', ent_url: 'http://books.google.es/books?id=lITCEAAAQBAJ' },
    { id: 9194279, label: 'Digital Twin – Fundamental Concepts to Applications in Advanced Manufacturing', type: 'Book', size: 1, date: '2021', ent_url: 'http://books.google.es/books?id=dVw9EAAAQBAJ' },
    { id: 41002721, label: 'Digital Twins for Wireless Networks', type: 'Book', size: 1, date: '2024', ent_url: 'http://books.google.fr/books?id=FSI3EQAAQBAJ' },
    /* real organizations */
    { id: 383105614, label: 'Otto Aerospace', type: 'Organization', size: 1, ent_url: 'https://ottoaerospace.com' },
    { id: 383105652, label: 'Spacewalk Automation', type: 'Organization', size: 1, ent_url: 'https://spacewalkautomation.com' },
    { id: 383105607, label: 'EchoTwin AI', type: 'Organization', size: 1, date: '2024', ent_url: 'http://www.echotwin.ai' },
    { id: 383069707, label: 'Geminum', type: 'Organization', size: 1, ent_url: 'https://www.geminum.co' },
    { id: 383105611, label: 'E8IGHT', type: 'Organization', size: 1, date: '2012', ent_url: 'https://e8ight.co.kr/' },
  ],
  links: [
    { source: 'anchor-solar-sail', target: 5360246, value: 2 },
    { source: 4482703, target: 5360246, value: 2 },
    { source: 6368958, target: 5360246, value: 2 },
    { source: 22183917, target: 5360246, value: 2 },
    { source: 15924081, target: 5360246, value: 2 },
    { source: 4720902, target: 5360246, value: 1 },
    { source: 1574435, target: 5360246, value: 2 },
    { source: 4482522, target: 5360246, value: 2 },
    { source: 8978244, target: 5360246, value: 2 },
    { source: 264282492, target: 5360246, value: 2 },
    { source: 154208, target: 5360246, value: 1 },
    { source: 2667196, target: 5360246, value: 3 },
    { source: 151912885, target: 5360246, value: 2 },
    { source: 117612487, target: 5360246, value: 2 },
    { source: 116500198, target: 5360246, value: 2 },
    { source: 21963359, target: 5360246, value: 1 },
    { source: 154553046, target: 5360246, value: 1 },
    { source: 169069653, target: 5360246, value: 1 },
    { source: 300799626, target: 5360246, value: 1 },
    { source: 383687636, target: 5360246, value: 2 },
    { source: 70921077, target: 5360246, value: 1 },
    { source: 21283655, target: 5360246, value: 1 },
    { source: 20266261, target: 5360246, value: 1 },
    { source: 4967419, target: 5360246, value: 1 },
    { source: 265798665, target: 5360246, value: 1 },
    { source: 265798708, target: 5360246, value: 1 },
    { source: 239690616, target: 5360246, value: 1 },
    { source: 265798714, target: 5360246, value: 1 },
    { source: 115820989, target: 5360246, value: 1 },
    { source: 16152514, target: 5360246, value: 1 },
    { source: 9194279, target: 5360246, value: 1 },
    { source: 41002721, target: 5360246, value: 1 },
    { source: 383105614, target: 5360246, value: 1 },
    { source: 383105652, target: 5360246, value: 1 },
    { source: 383105607, target: 5360246, value: 1 },
    { source: 383069707, target: 5360246, value: 1 },
    { source: 383105611, target: 5360246, value: 1 },
    /* real cross-links from the export */
    { source: 22183917, target: 154553046, value: 1 },
    { source: 6368958, target: 151912885, value: 1 },
  ],
};

/* ── SOLAR SAIL — lab subject, synthetic graph (indices not yet computed) ── */
const solarSail = {
  meta: {
    label: 'solar sail',
    type: 'Subject',
    summary:
      'Propellant-free propulsion that rides photon pressure on large reflective membranes; the nearest-term path to interstellar precursor missions.',
    indices: null,
  },
  nodes: [
    { id: 'ss', label: 'solar sail', type: 'Subject', size: 6 },
    { id: 'ss-npp', label: 'nuclear pulse propulsion', type: 'Subject', size: 3, to: 'nuclear_pulse_propulsion' },
    { id: 'ss-dt', label: 'digital twin', type: 'Subject', size: 3, to: 'digital_twin' },
    { id: 'ss-ram', label: 'ramscoop', type: 'Subject', size: 2 },
    { id: 'ss-gen', label: 'generation ship', type: 'Subject', size: 2 },
    { id: 'ss-pa1', label: 'Laser-driven light sails for interstellar precursor missions', type: 'Paper', size: 2, date: '2023', ent_url: 'https://example.org/paper/light-sails' },
    { id: 'ss-pa2', label: 'Membrane dynamics of spinning solar sails', type: 'Paper', size: 2, date: '2021', ent_url: 'https://example.org/paper/membrane-dynamics' },
    { id: 'ss-pt1', label: 'Deployable boom for large-area photon sails', type: 'Patent', size: 2, date: '2022', ent_url: 'https://example.org/patent/deployable-boom' },
    { id: 'ss-pr1', label: 'Solar sail demonstrator unfurls in orbit', type: 'Press', size: 1, date: '2025', ent_url: 'https://example.org/press/sail-demonstrator' },
    { id: 'ss-o1', label: 'Photon Line Aerospace', type: 'Organization', size: 2, ent_url: 'https://example.org/org/photon-line' },
    { id: 'ss-bk1', label: 'Sailing on Starlight', type: 'Book', size: 1, date: '2020', ent_url: 'https://example.org/book/sailing-on-starlight' },
  ],
  links: [
    { source: 'ss', target: 'ss-npp', value: 2 },
    { source: 'ss', target: 'ss-dt', value: 2 },
    { source: 'ss', target: 'ss-ram', value: 2 },
    { source: 'ss', target: 'ss-gen', value: 2 },
    { source: 'ss', target: 'ss-pa1', value: 2 },
    { source: 'ss', target: 'ss-pa2', value: 2 },
    { source: 'ss', target: 'ss-pt1', value: 2 },
    { source: 'ss', target: 'ss-pr1', value: 1 },
    { source: 'ss', target: 'ss-o1', value: 2 },
    { source: 'ss', target: 'ss-bk1', value: 1 },
    { source: 'ss-o1', target: 'ss-pr1', value: 1 },
    { source: 'ss-pa1', target: 'ss-pt1', value: 1 },
  ],
};

/* ── NUCLEAR PULSE PROPULSION — lab subject, synthetic graph ── */
const nuclearPulse = {
  meta: {
    label: 'nuclear pulse propulsion',
    type: 'Subject',
    summary:
      'Propulsion by detonating nuclear pulse units behind a pusher plate; the Orion lineage of high-thrust, high-impulse concepts.',
    indices: null,
  },
  nodes: [
    { id: 'np', label: 'nuclear pulse propulsion', type: 'Subject', size: 6 },
    { id: 'np-dt', label: 'digital twin', type: 'Subject', size: 3, to: 'digital_twin' },
    { id: 'np-ss', label: 'solar sail', type: 'Subject', size: 3, to: 'solar_sail' },
    { id: 'np-ffr', label: 'fission fragment rocket', type: 'Subject', size: 2 },
    { id: 'np-ion', label: 'ion engine', type: 'Subject', size: 2 },
    { id: 'np-pa1', label: 'Pusher-plate ablation limits in pulsed propulsion', type: 'Paper', size: 2, date: '2022', ent_url: 'https://example.org/paper/pusher-plate' },
    { id: 'np-pa2', label: 'Magnetic nozzle control for pulsed fusion stages', type: 'Paper', size: 2, date: '2024', ent_url: 'https://example.org/paper/magnetic-nozzle' },
    { id: 'np-pt1', label: 'Shock-absorbing pusher plate assembly', type: 'Patent', size: 2, date: '2021', ent_url: 'https://example.org/patent/shock-plate' },
    { id: 'np-pr1', label: 'Study revisits Orion-class architectures', type: 'Press', size: 1, date: '2025', ent_url: 'https://example.org/press/orion-class' },
    { id: 'np-o1', label: 'Pulse Drive Works', type: 'Organization', size: 2, ent_url: 'https://example.org/org/pulse-drive' },
    { id: 'np-bk1', label: 'The Starship Ledger', type: 'Book', size: 1, date: '2019', ent_url: 'https://example.org/book/starship-ledger' },
  ],
  links: [
    { source: 'np', target: 'np-dt', value: 2 },
    { source: 'np', target: 'np-ss', value: 2 },
    { source: 'np', target: 'np-ffr', value: 2 },
    { source: 'np', target: 'np-ion', value: 2 },
    { source: 'np', target: 'np-pa1', value: 2 },
    { source: 'np', target: 'np-pa2', value: 2 },
    { source: 'np', target: 'np-pt1', value: 2 },
    { source: 'np', target: 'np-pr1', value: 1 },
    { source: 'np', target: 'np-o1', value: 2 },
    { source: 'np', target: 'np-bk1', value: 1 },
    { source: 'np-pa1', target: 'np-pt1', value: 1 },
    { source: 'np-ffr', target: 'np-pa2', value: 1 },
  ],
};

/* ── SOURCE SNAPSHOT — the field's founding paper, wired from REAL citation
      edges in the digital-twin export (Grieves & Vickers, 2017) ── */
const paperDtEmergent = {
  meta: {
    label: 'Digital Twin: Mitigating Unpredictable, Undesirable Emergent Behavior in Complex Systems',
    type: 'Paper',
    summary:
      'The 2017 Grieves and Vickers chapter that formalized the digital twin concept; one of the most cited works in the field.',
  },
  nodes: [
    { id: 2667196, label: 'Digital Twin: Mitigating Unpredictable, Undesirable Emergent Behavior in Complex Systems', type: 'Paper', size: 6, date: '2017', ent_url: 'https://doi.org/10.1007/978-3-319-38756-7_4' },
    { id: 5360246, label: 'digital twin', type: 'Subject', size: 3, to: 'digital_twin' },
    /* real papers citing it (CITES edges in the export) */
    { id: 204835963, label: 'The Characteristics of Digital Twin in Cyberspace: A Knowledge Perspective', type: 'Paper', size: 2, date: '2019', ent_url: 'https://www.semanticscholar.org/paper/4c50e5a1acd85ced2c14e9e9c1a8793feeafa78b' },
    { id: 137811529, label: 'Exploiting Digital Twin Technology to Teach Engineering Fundamentals', type: 'Paper', size: 2, date: '2019', ent_url: 'https://www.semanticscholar.org/paper/2f4fff212ed12c466b5ab9c8afccaa65a0ff440c' },
    { id: 135742019, label: 'Digital Twin for Reliability Analysis During Design and Operation of Mechatronic Systems', type: 'Paper', size: 2, date: '2019', ent_url: 'https://www.semanticscholar.org/paper/2ecc829ca285a25414f7f48a7b7511d375d8d355' },
    { id: 143657958, label: 'Faster than real-time simulation of mobile crane dynamics using digital twin concept', type: 'Paper', size: 2, date: '2018', ent_url: 'https://www.semanticscholar.org/paper/c222cc098a53bba8ae482c115556ce2eba71e544' },
    { id: 130041347, label: 'Developing a Skilled Workforce for Future Industry Demand', type: 'Paper', size: 2, date: '2023', ent_url: 'https://www.semanticscholar.org/paper/db6af885d3cca297fbeb656cd748f90d0c622b44' },
    { id: 119049042, label: 'Digital twin technology for smart manufacturing and industry 4.0: A bibliometric analysis', type: 'Paper', size: 2, date: '2021', ent_url: 'https://www.semanticscholar.org/paper/e22d968d6f1d5a4e72fcd34cad108882bfb38f81' },
    /* real paper IT cites */
    { id: 4443443, label: 'On the Effects of Modeling As-Manufactured Geometry: Toward Digital Twin', type: 'Paper', size: 2, date: '2014' },
  ],
  links: [
    { source: 2667196, target: 5360246, value: 3 },
    { source: 204835963, target: 2667196, value: 2 },
    { source: 137811529, target: 2667196, value: 2 },
    { source: 135742019, target: 2667196, value: 2 },
    { source: 143657958, target: 2667196, value: 2 },
    { source: 130041347, target: 2667196, value: 2 },
    { source: 119049042, target: 2667196, value: 2 },
    { source: 2667196, target: 4443443, value: 2 },
  ],
};

export const NETWORKS = {
  digital_twin: digitalTwin,
  solar_sail: solarSail,
  nuclear_pulse_propulsion: nuclearPulse,
  paper_dt_emergent: paperDtEmergent,
};

/* real sanitized /graphs/simple downloads drop in here — see header note */
const dropins = import.meta.glob('./fast/graphs/*.json', { eager: true });
for (const path of Object.keys(dropins)) {
  const key = path.split('/').pop().replace('.json', '');
  const mod = dropins[path];
  const graph = mod.default || mod;
  if (graph && graph.nodes && graph.links && graph.meta) NETWORKS[key] = graph;
}

export const START = 'digital_twin';

/* product color grammar — exact hexes from NetworkGraph NODE_TYPE_COLORS */
export const NODE_TYPE_COLORS = {
  Subject: '#4252BD',
  Organization: '#E07B91',
  Press: '#E69500',
  Patent: '#C3DE6D',
  Paper: '#20C6DB',
  Book: '#46ACC8',
  default: '#999999',
};

/* product index grammar — theme tokens horizonRank / whiteSpace / techTransfer */
export const INDEX_META = [
  { key: 'hr', label: 'Horizon Rank', abbr: 'HR', color: '#D4AF37' },
  { key: 'ws', label: 'White Space', abbr: 'WS', color: '#20B2AA' },
  { key: 'tt', label: 'Tech Transfer', abbr: 'TT', color: '#FF6B47' },
];
