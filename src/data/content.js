// ============================================
// Site Configuration
// ============================================
export const siteConfig = {
  name: 'Carlton Lindsay',
  title: 'Carlton Lindsay — Design Engineer',
  // Tagline decided 2026-07-02. Alternates Carlton is still considering:
  // "Designer who debugs. Engineer who dreams." / "Designer who deploys. Engineer who delights."
  description:
    'Designer who deploys. Engineer who dreams. I build what I design. Carlton Lindsay is a Design Engineer building AI-native interfaces — knowledge graphs, multi-agent pipeline UIs, and research tools — at Futurity Systems.',
  url: 'https://carlton.dev',
  social: {
    linkedin: 'https://linkedin.com/in/carltonl',
    github: 'https://github.com/Carlton-L',
    email: 'carlton@carlton.dev',
  },
  keywords: [
    'Carlton Lindsay',
    'Design Engineer',
    'Design Technologist',
    'AI Interfaces',
    'React Developer',
    'TypeScript',
    'Data Visualization',
    'Knowledge Graphs',
    'Interaction Design',
    'AI-Native Product Design',
    'Creative Technologist',
  ],
};

// ============================================
// Categories
// ============================================
export const categories = [
  {
    number: '01',
    title: 'AI-Native Interfaces',
    subtitle: 'Production tools where humans steer AI systems — graphs, pipelines, and research platforms',
    description:
      'Production React applications for working with AI systems: knowledge-graph visualization, multi-agent pipeline UIs, and tools that turn LLM output into something people can actually reason about.',
    count: '5 projects',
    slug: 'apps-systems',
    accent: 'accent-1',
    image: '/images/categories/apps-systems.jpg',
  },
  {
    number: '02',
    title: 'Experiences & Hardware',
    subtitle: 'Installations, robotics, and interactions that bridge physical and digital space',
    description:
      'A decade of hardware prototyping — Apple Vision Pro labs, robotics, sensor-driven installations. The build-first instinct behind the software work.',
    count: '4 projects',
    slug: 'experiences',
    accent: 'accent-2',
    image: '/images/categories/experiences.jpg',
  },
  {
    number: '03',
    title: 'Research & Writing',
    subtitle: 'Qualitative research and thinking on AI, learning, and human capability',
    description:
      'Design research and writing on how AI should augment human capability — from qualitative studies on skill development to notes on AI-native workflows.',
    count: '1 project',
    slug: 'research',
    accent: 'accent-3',
    image: '/images/categories/research.jpg',
  },
];

// ============================================
// All Projects
// ============================================
export const projects = [
  {
    title: 'FAST',
    description:
      'An AI-accelerated science and foresight platform — knowledge-graph visualization, node-based analysis workflows, and LLM-driven invention tools used by research and innovation teams.',
    meta: '2025–2026 — Lead Frontend Engineer & Lead UX/UI Designer · Futurity Systems',
    category: 'AI-Native Interfaces',
    categorySlug: 'apps-systems',
    image: '/images/projects/fast/cover.jpg',
    slug: 'fast',
    accent: 'accent-1',
    tags: ['React', 'TypeScript', 'Cosmograph', 'React Flow', 'LLM Tools', 'Design System'],
    featured: true,
    hasCustomPage: true,
    facts: {
      role: 'Lead Frontend Engineer & Lead UX/UI Designer',
      year: '2025–2026',
      stack: 'React, TypeScript, Chakra UI, Cosmograph, React Flow, D3',
      company: 'Futurity Systems',
    },
  },
  {
    title: 'Futurity Engine',
    description:
      'A multi-agent research engine that streams its reasoning into a live, GPU-accelerated knowledge graph — watch AI agents gather papers, patents, and signals in real time.',
    meta: '2026 — UI Concept, Frontend & Backend Contributions · Futurity Systems',
    category: 'AI-Native Interfaces',
    categorySlug: 'apps-systems',
    image: '/images/projects/futurity-engine/cover.jpg',
    slug: 'futurity-engine',
    accent: 'accent-1',
    tags: ['React', 'SSE Streaming', 'Multi-Agent AI', 'WebGL Graphs', 'FastAPI'],
    featured: true,
    hasCustomPage: true,
    facts: {
      role: 'UI Concept Prototype, Frontend, Backend Contributions',
      year: '2026',
      stack: 'React, TypeScript, Cosmograph, FastAPI, SSE, Docker',
      company: 'Futurity Systems',
    },
    caseStudy: [
      {
        heading: 'What it is',
        body: [
          'The Futurity Engine answers one research question with a small army. You ask something like "how close are solid-state batteries to displacing lithium-ion", and a five-phase pipeline pulls papers, patents, organizations and press out of Futurity’s knowledge network, computes signals over the evidence, and sets ten domain agents loose on the question. Every step streams to the browser over Server-Sent Events and lands in a live knowledge graph with more than 25 node types. You watch the system think while it thinks.',
        ],
      },
      {
        heading: 'How it works',
        body: [
          'A run starts from a question, or from a lab: a curated taxonomy of subjects built in FAST. The Engine pulls everything connected to those subjects from the knowledge network, then computes a layer of signals over the pool. Research velocity, patent concentration, citation momentum, whitespace. Each signal keeps pointers to the exact papers behind it, so no claim floats free of its evidence. Then the agents run. Each one researches, turns around and attacks its own findings in a critique round, and a synthesis pass folds all ten analyses into a report with scenarios, confidence scores and receipts.',
          'Runs are long. Minutes at best, hours on a big lab. So the system is honest about time: every phase checkpoints, an interrupted run resumes without re-running finished agents, and the interface knows the difference between working quietly and being stuck.',
        ],
      },
      {
        heading: 'My role',
        body: [
          'The Engine was our CEO’s idea. I gave it its first form: a working prototype of the UI concept, a collapsed version of what is now a massive node graph. That prototype settled the core interaction bet early: agent reasoning should be a graph you can navigate, not a wall of logs you scroll.',
          'From there I built the frontend alongside the team. The visual system is mine: the theme architecture, the shape and color grammar that makes node types readable at a glance, and most of the report, publishing and chat surfaces. So are the streaming designs the team built against, incremental graph ingest with no rebuilds, and the heartbeat liveness contract I wrote for the backend before the backend emitted it.',
        ],
      },
      {
        heading: 'The hard interaction problem',
        body: [
          'Streaming an unbounded agent process into a graph without drowning the user is a real interaction problem. Nodes arrive continuously for minutes, the layout wants to shift under your cursor, and you still need to know where you are. The answers were concrete: ingest incrementally so the map never rebuilds, encode node types by shape and color so the picture reads at a glance, and keep the noisy machinery in the graph but hidden until someone asks for it.',
        ],
      },
      {
        heading: 'Outcome',
        body: [
          'The Engine runs today as a Dockerized multi-service stack with resumable checkpoints, and the frontend stays responsive through runs that take the better part of an hour. It is the clearest statement of the thesis that runs through all my work: an AI system earns trust when its process is legible.',
        ],
      },
    ],
  },
  {
    title: 'carlton.dev',
    description:
      'This site, built as a live dataflow patch. Every content block is a typed operator, the cables route real messages on a small vanilla-JS runtime, the dither background comes from a visible operator chain you can tweak, and node placement is authored as ASCII grid-areas resolved at runtime.',
    meta: '2026 — Design & Build (solo) · Personal',
    category: 'Design Engineering',
    categorySlug: 'apps-systems',
    slug: 'carlton-dev',
    accent: 'accent-1',
    liveUrl: 'https://carlton.dev',
    tags: ['Astro', 'Vanilla JS', 'Canvas', 'Design System', 'React Islands'],
    featured: true,
    hasCustomPage: true,
    facts: {
      role: 'Design & Build (solo)',
      year: '2026',
      stack: 'Astro 6, React islands, Tailwind 4, vanilla JS patch runtime',
      company: 'Personal',
    },
  },
  {
    title: 'Futurescaper',
    description:
      'A futures-exploration tool for mapping scenario spaces: custom graph layouts and AI orchestration for navigating possible futures.',
    meta: '2025–2026 — Design & Full-Stack Development · Futurity Systems',
    category: 'AI-Native Interfaces',
    categorySlug: 'apps-systems',
    image: '/images/projects/futurescaper/cover.jpg',
    slug: 'futurescaper',
    accent: 'accent-1',
    liveUrl: 'https://futurescape.futurity.science',
    tags: ['React', 'TypeScript', 'Graph Layouts', 'AI Orchestration', 'Data Viz'],
    featured: true,
    facts: {
      role: 'Design & Full-Stack Development (solo rebuild)',
      year: '2025–2026',
      stack: 'React, TypeScript, custom graph layouts, LLM orchestration, full-stack build',
      company: 'Futurity Systems',
      live: 'futurescape.futurity.science',
    },
    caseStudy: [
      {
        heading: 'What it is',
        body: [
          'Futurescaper is a futures-exploration tool. You give it a scenario, a driver, a "what if", and it maps the consequences outward: first-order effects, then the second- and third-order ripples those set off. The result reads like a metro map you can explore, not a list you scroll. Consequences are organized along the STEEPLE dimensions (social, technological, economic, environmental, political, legal, ethical), so a scenario’s blind spots show up at a glance. If a whole dimension is thin, the map says so.',
          'Foresight data has structure that generic graph tools throw away. Drop it into an off-the-shelf force-directed layout and it collapses into a hairball, exactly when the picture matters most. Futurescaper treats that structure as hard constraints: orders of consequence, causal lineage, category. The map stays a map as it grows.',
        ],
      },
      {
        heading: 'The layout problem',
        body: [
          'The layout is the argument. A consequence map has a grammar that force-directed graphs can’t respect. Consequences belong to orders (how many steps removed from the seed), every node carries a causal lineage back to that seed, and children should sit inside their parent’s outward cone instead of drifting back toward the center. The custom layout encodes all of it. Orders become concentric bands. Ring radius grows with node count, so crowded orders don’t collide. Each new node fills the largest angular gap.',
          'That last rule buys the property users actually feel: spatial stability. When new AI-generated consequences arrive, existing nodes barely move, and the mental map you just built stays intact. I tuned for stability over elegance. An arrangement you can keep your bearings in beats a tighter one that reshuffles on every generation.',
        ],
      },
      {
        heading: 'My role',
        body: [
          'Futurescaper began as a colleague’s quick proof-of-concept: LLM calls fired straight from the browser, no backend, no persistence. I rebuilt it from the ground up, solo. The interface and graph rendering, the custom layout system, the exploration interactions, and a real backend to own the AI orchestration, prompt structure, and generation state. The concept was a shared starting point. The design, the frontend, and the backend are mine.',
          'It’s the most focused instrument I’ve built at Futurity Systems. It distills lessons from FAST (knowledge-graph interfaces) and the Futurity Engine (streaming multi-agent reasoning) into one tool that does a single thing well: turn a scenario into a legible map you can think with.',
        ],
      },
      {
        heading: 'Craft notes',
        body: [
          'The interesting problems all lived at the design-engineering seam. How much layout stability do you trade for clarity when new nodes land? How do you make machine-generated content visibly distinct from human-curated content, so trust has a seam you can see? How do you keep interaction latency imperceptible while a layout recomputes over a growing graph? None of these is answerable from the design side or the engineering side alone.',
          'The answers were concrete. Recompute layouts off the main thread, so interaction never stalls. Render AI-generated nodes in a distinct visual state until a human promotes them. Tune the layout for stability first, so the map is a place you return to, not a picture that gets redrawn.',
        ],
      },
      {
        heading: 'Outcome',
        body: [
          'Futurescaper runs as a real product, a designed frontend on a backend that owns generation, live at futurescape.futurity.science. It’s the clearest small statement of the through-line in my work: an AI tool earns trust when its output is legible, and legibility is a layout problem as much as a model problem.',
        ],
      },
    ],
  },
  {
    title: 'Campus AI — Learning Research',
    description:
      'Qualitative design research for an LLM-guided learning platform: 42 surveys and 8 depth interviews with career shifters, synthesized into strategic product recommendations.',
    meta: '2024 — Design Research · Harbour.Space × Campus AI',
    category: 'Research & Writing',
    categorySlug: 'research',
    image: '/images/projects/campus-ai/cover.jpg',
    slug: 'campus-ai',
    accent: 'accent-3',
    tags: ['UX Research', 'AI & Learning', 'Qualitative Methods', 'Strategy'],
    featured: true,
    facts: {
      role: 'Design Researcher (team of 4)',
      year: '2024',
      stack: '42-respondent survey, 8 × 90-min depth interviews, thematic coding',
      company: 'Harbour.Space × Campus AI',
    },
    caseStudy: [
      {
        heading: 'The question',
        body: [
          'Campus AI was building an LLM tool for structured learning and needed to know: who is the most motivated user? We studied mid-career professionals changing careers — how they choose paths, learn, stay motivated, and validate progress.',
        ],
      },
      {
        heading: 'Method',
        body: [
          'A 42-respondent screening survey of current and recent career changers, followed by eight 90-minute open-ended interviews across four countries, coded thematically as a team of four.',
        ],
      },
      {
        heading: 'Key insights',
        body: [
          'Career shifters don’t job hunt — they stumble into paths through people, then validate them through "proxy communities" of strangers who’ve made the same move. They want a career-shift playbook, not a skill list. They validate learning through outputs — projects and portfolios, not certificates. And most digital learning tools fail them on the one thing they value most: direct human communication.',
        ],
      },
      {
        heading: 'Strategic recommendations',
        body: [
          'Give AI-generated content a human face — learners trust content anchored to people, so design the AI as visible personas rather than an anonymous engine. Let AI act as proxy feedback where peers are absent. Show learning outcomes up front, like a GPS destination: even when the learner takes a wrong route, the system re-routes toward a visible goal. And ground the roadmap in the live job market, because employability is the real outcome career shifters are buying.',
          'These findings — capability over engagement, AI as a partner that makes people more able rather than more retained — continue to shape how I design AI products.',
        ],
      },
    ],
  },
  {
    title: 'Immersive Experience Builder',
    description:
      'A framework and visual tool for creating interactive, sensor-driven spatial experiences.',
    meta: '2024 — Framework Design',
    category: 'AI-Native Interfaces',
    categorySlug: 'apps-systems',
    image: '/images/projects/immersive-experience-builder/cover.jpg',
    slug: 'immersive-experience-builder',
    accent: 'accent-1',
    tags: ['Framework', 'Spatial Computing', 'Sensors', 'Interactive'],
  },
  {
    title: 'Lab Equipment Portal',
    description:
      'Real-time equipment tracking and reservation system connecting digital interfaces to physical lab spaces — the project that pivoted my career from hardware to software.',
    meta: '2021 — Full Stack Development',
    category: 'AI-Native Interfaces',
    categorySlug: 'apps-systems',
    image: '/images/projects/lab-equipment-portal/cover.jpg',
    slug: 'lab-equipment-portal',
    accent: 'accent-1',
    tags: ['Full Stack', 'React', 'Node.js', 'GraphQL'],
  },
  {
    title: 'Futures Garden',
    description:
      'An EU initiative exploring life in 2040 through conversations with digital souls — LLM-powered archetypes accessed via a physical Orb with NFC-enabled phygital objects.',
    meta: '2025 — Experience Design & Prototyping · Futurity Systems',
    category: 'Experiences & Hardware',
    categorySlug: 'experiences',
    image: '/images/projects/futures-garden/cover.jpg',
    slug: 'futures-garden',
    accent: 'accent-2',
    tags: ['LLM', 'NFC', 'Physical Computing', 'EU Commission'],
  },
  {
    title: 'Biomimetic Eye Prototype',
    description:
      'An animatronic eye mechanism exploring expressive robotic movement through custom mechanics, RGB illumination, and modular assembly.',
    meta: '2024 — Robotics & Prototyping',
    category: 'Experiences & Hardware',
    categorySlug: 'experiences',
    image: '/images/projects/biomimetic-eye/cover.jpg',
    slug: 'biomimetic-eye',
    accent: 'accent-2',
    tags: ['Robotics', 'CAD', 'Animatronics', 'Prototyping'],
  },
  {
    title: 'Interactive Home Lighting',
    description:
      'A computer vision presence detection system that dynamically controls home lighting based on occupancy and movement.',
    meta: '2024 — Systems Design',
    category: 'Experiences & Hardware',
    categorySlug: 'experiences',
    image: '/images/projects/home-lighting/cover.jpg',
    slug: 'home-lighting',
    accent: 'accent-2',
    tags: ['Computer Vision', 'IoT', 'Smart Home', 'Python'],
  },
  {
    title: 'Synthetic Plant Exploration',
    description:
      'Revisiting BEAM robotics with modern components — creating simple, analog-driven robotic plants as an exploration of emergent behavior.',
    meta: '2024 — Robotics & Exploration',
    category: 'Experiences & Hardware',
    categorySlug: 'experiences',
    image: '/images/projects/synthetic-plant/cover.jpg',
    slug: 'synthetic-plant',
    accent: 'accent-2',
    tags: ['BEAM Robotics', 'Analog', 'Emergent Behavior'],
  },
];

// ============================================
// Derived Data
// ============================================
export const caseStudies = {
  'apps-systems': projects.filter((p) => p.categorySlug === 'apps-systems'),
  experiences: projects.filter((p) => p.categorySlug === 'experiences'),
  research: projects.filter((p) => p.categorySlug === 'research'),
};

export const pinnedItems = projects.filter((p) => p.featured);

// ============================================
// Contact Links
// ============================================
export const contactLinks = [
  { label: 'Email', value: 'carlton@carlton.dev', href: 'mailto:carlton@carlton.dev' },
  { label: 'LinkedIn', value: 'linkedin.com/in/carltonl', href: 'https://linkedin.com/in/carltonl' },
  { label: 'GitHub', value: 'github.com/Carlton-L', href: 'https://github.com/Carlton-L' },
  { label: 'CV', value: 'download PDF ↓', href: '/cv/Carlton_Lindsay_Design_Engineer_CV.pdf' },
];

// ============================================
// About Page Content
// ============================================
export const aboutContent = {
  intro:
    'Designer who deploys. Engineer who dreams. I build what I design.',
  education: [
    {
      degree: "Master's, Interaction Design",
      school: 'Harbour.Space University',
      place: 'Barcelona',
      // dates intentionally omitted — Carlton to confirm years; don't guess
    },
  ],
  bio: [
    'I spent a decade in hardware before I ever shipped a web app: component-level electronics repair, then prototyping labs for medical devices, VR hardware, and consumer electronics, then building out product-design labs at Apple, where I worked on Vision Pro. Hardware taught me that ideas are cheap and prototypes are truth — you find out what works by building it.',
    "A lab-equipment portal I built in React was the hinge: designing how people interact with systems turned out to be the part I couldn't put down. I did a Master's in Interaction Design in Barcelona, then joined Futurity Systems as Design Technologist and Product Lead, where I now build AI research tools — knowledge-graph interfaces, multi-agent pipeline UIs, and the design systems behind them.",
    'The through-line is making AI systems legible. Agent pipelines, research engines, and LLM tools are only trustworthy when people can see what they’re doing and steer them. That’s the problem I keep choosing: the seam where interaction design meets production engineering — and where I work daily with AI coding agents as genuine collaborators in how I build.',
  ],
  experience: [
    { role: 'Design Engineer & Product Lead', company: 'Futurity Systems', dates: 'Feb 2025 — Present' },
    { role: 'Hardware Associate Engineer', company: 'Apple', dates: '2022 — 2023' },
    { role: 'Product Development Lab Manager', company: 'Pensar Development', dates: '2016 — 2022' },
    { role: 'Senior PCB Repair Technician', company: 'FUJIFILM SonoSite', dates: '2015 — 2016' },
    { role: 'Robotics Technician', company: 'Hydromax USA', dates: '2014 — 2015' },
  ],
  skills: [
    'React & TypeScript',
    'AI-Native Interface Design',
    'Data Visualization & Knowledge Graphs',
    'LLM Integration & Multi-Agent UX',
    'Design Systems',
    'AI-Assisted Development (Claude Code, Cursor)',
    'Interaction & Motion Design',
    'Python & FastAPI',
    'Design Research',
    'Rapid Prototyping (Software & Hardware)',
    'Spatial Computing (VR/AR)',
    'Robotics & Electronics',
  ],
};
