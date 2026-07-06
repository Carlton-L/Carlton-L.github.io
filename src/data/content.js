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
      'Futurity Analysis & Synthesis Tools — an AI research and foresight platform with knowledge-graph visualization, node-based analysis workflows, and LLM-driven invention tools used by research and innovation teams.',
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
    caseStudy: [
      {
        heading: 'What it is',
        body: [
          'FAST is Futurity Analysis & Synthesis Tools, the research and foresight platform at the center of everything Futurity Systems ships. Underneath sits a knowledge network: subjects connected to the organizations, press, patents, papers and books that mention them. On top sit labs, collaborative workspaces where innovation teams plan goals, gather subjects, and run analysis and invention tools against the data. I owned the frontend end to end, around 350 TypeScript components, and led the UX and UI of the whole product.',
        ],
      },
      {
        heading: 'My role',
        body: [
          'Lead Frontend Engineer and Lead UX/UI Designer. Every screen went through my hands twice, once as a design problem and once as a React build. That double pass is the method: interaction ideas survived only if they could ship, and engineering decisions were made with the design intent in the room. Where the interface needed contracts that did not exist yet, I reached into the FastAPI backend and contributed them.',
        ],
      },
      {
        heading: 'The subject page',
        body: [
          'Every subject in the network has a page, and the page is built in layers. The ground layer is the network itself: a GPU-accelerated graph of everything connected to the subject, each entity type in its own color. Glass cards float above it carrying the subject’s identity and its three strategic indices. Below come the analytics: activity trends across decades, forecasts per source type, related subjects and related analyses. Each section loads independently, so a slow chart never holds the page hostage.',
          'The move that makes it a portal is traversal. Click any node and the camera glides to it and an info card identifies it. If the node is another subject, a button appears: go to that subject. One tap and you are standing on its page, inside its own graph. Navigation is not a menu, it is walking the network one camera position at a time.',
        ],
      },
      {
        heading: 'Source pages',
        body: [
          'Subjects are not the only citizens with pages. Organizations, patents, press, papers and books each get one too, built from a single shared snapshot pattern: the same layered grammar and the same color system, configured per entity type. Learn to read one page and you can read the entire network. That sameness was a design decision, not a shortcut.',
        ],
      },
      {
        heading: 'The lab flow',
        body: [
          'Labs are where teams act on the network, and the tabs read like a sentence: plan, gather, analyze, forecast, invent. Plan turns strategy into structured goals through a stepped wizard that asks who is affected, how many people, in which regions, what problems, and what impact by which horizon year. Gather is a board where subjects found through web and curated-source searches get dragged into categories, with every action optimistic, undoable, and silently synced so teammates never collide. The later tabs land on the same foundation, each tool drawing on the corpus the team gathered.',
        ],
      },
      {
        heading: 'Design system',
        body: [
          'All of it stands on one Chakra-based token system. Semantic tokens for the three indices, one source-type palette shared by the graph, the stat cards and every chart, dark and light modes throughout, and a consistent feedback grammar: toasts with undo, per-section skeletons, and status copy that admits when a computation is slow instead of spinning forever.',
        ],
      },
      {
        heading: 'Outcome',
        body: [
          'FAST is in production with client innovation teams. For my own practice it is the project where the patterns I now use everywhere hardened: progressive disclosure for dense data, semantic visual encoding, optimistic interfaces that can apologize, and navigation treated as a spatial experience rather than a sitemap.',
        ],
      },
    ],
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
    title: 'GRID — Kinetic Light',
    description:
      'A lamp you sculpt by touch: sixteen motorized cylinders, one number each driving height, brightness and warmth. Running here as a full working sim while the hardware build is in progress.',
    meta: '2026 — Kinetic Light · Sim-First Hardware',
    category: 'Experiences & Hardware',
    categorySlug: 'experiences',
    image: '/images/projects/grid-lamp/cover.jpg',
    slug: 'grid-lamp',
    accent: 'accent-2',
    live: true,
    tags: ['Kinetic Light', 'Three.js', 'Hardware', 'Simulation'],
    facts: {
      role: 'Design, simulation & hardware plan, solo',
      year: '2026',
      stack: 'Vanilla JS + Three.js sim · 28BYJ-48 steppers + tunable-white LEDs (planned)',
      company: 'Personal project',
    },
    caseStudy: [
      {
        heading: 'What it is',
        body: [
          'GRID is a lamp: sixteen frosted cylinders in a 4×4 bed, each on its own lead screw with its own tunable-white LEDs. Hold a cylinder and it rises; hold it again quickly and it lowers. Each cylinder is one number: height, brightness and color temperature all come from it. Low cylinders glow like an 1800 K ember; the light only cools toward the slider ceiling as they rise.',
          'There are static set-points (Full, Night, Off, plus anything you sculpt and save) and four motion patterns: wave, ripple, fireplace, noise. The motors are simulated too, 28BYJ-48 steppers with trapezoidal ramps, so everything on screen moves at the speed the real lamp would.',
        ],
      },
      {
        heading: 'Sim first, hardware second',
        body: [
          'Right now the lamp is a working simulation, on purpose. The sim is where the hardware decisions get made cheaply: jog feel, 60 versus 110 mm of travel, the shape of the warm-to-cool ramp, whether the patterns still read at real motor speed. All of it gets decided on screen before I commit to parts.',
          'It started as an experiment in the lab on this site. Once the sim had two live views, one shared state and real motor physics, it had outgrown the lab, so it moved up here.',
        ],
      },
      {
        heading: 'Why the controls work this way',
        body: [
          'Jog, not slider. Hold means keep moving; release means stop. And the app draws where each cylinder actually is, not where you told it to go: anything still traveling gets a pulsing rim. I did not want a screen showing a lamp that does not exist yet.',
          'One number per cylinder. Height, brightness and color are locked together on purpose. Dim light is always warm; there is no way to build a low, cold scene, and I consider that a feature. Night mode caps the ceiling at 2700 K, and the cap eases in rather than snapping, the way firmware would fade it.',
          'The motors set the rules. Range clamps travel for everything: set-points, patterns, your fingers. And the patterns run through the same motor model as manual holds, so a fireplace flicker can only ever move as fast as a lead screw turns.',
        ],
      },
      {
        heading: 'What only the build can answer',
        body: [
          'How loud are sixteen steppers in a quiet room? Does real frosted plastic scatter anything like the shader? How low can the LEDs dim before the ember falls apart? Those questions are waiting on hardware, and build photos land here as it comes together.',
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
    facts: {
      role: 'Independent project, solo',
      year: '2024',
      stack: 'React visual builder, 100+ component taxonomy',
      company: 'Independent',
    },
    caseStudy: [
      {
        heading: 'The brief',
        body: [
          'Sensor-driven spatial experiences, rooms that notice you and respond, get designed from scratch every time. A motion sensor here, a projector there, some glue code, and none of it transfers to the next project. There was no shared vocabulary for what these experiences are made of, which meant every new one started at zero and non-engineers could not participate in the design at all.',
          'So in 2024 I built one, as an independent project: a framework for describing these experiences as compositions of known parts, and a visual tool for assembling them.',
        ],
      },
      {
        heading: 'A grammar of parts',
        body: [
          'The core of the project is a taxonomy: a database of over 100 catalogued building blocks, the things an interactive space is actually made of. Things that perceive (sensors), things that respond (projectors, speakers, lights, behaviors), and the context they operate in. Instead of treating each installation as bespoke, the framework treats it as a sentence built from a known grammar.',
          'Cataloguing the parts was most of the design work. Once the vocabulary existed, the tool was almost the easy part.',
        ],
      },
      {
        heading: 'Plate, brigade, restaurant',
        body: [
          'The framework organizes everything through a restaurant metaphor: Plate, Brigade, Restaurant, mapping to Perception, Responsiveness, and Context. The Plate is what the guest directly perceives. The Brigade is the machinery that responds behind the scenes. The Restaurant is the whole context the experience lives in.',
          'The point of the metaphor is legibility. A producer or a spatial designer who has never wired a sensor can still reason about an experience in these terms, argue about it, and change it. Naming systems are interface design. This one was chosen so that the people who design experiences and the people who build them could look at the same structure.',
        ],
      },
      {
        heading: 'The visual builder',
        body: [
          'The framework ships with a visual tool, a React app for composing experiences from the component database. You lay out the space, place sensor zones, and wire perception to response. The output is a specification of the experience, not a runnable installation: it describes what to build and how the parts connect, for humans to execute.',
          'Building the tool forced the taxonomy to be honest. Every component that could not be composed cleanly in the interface was a component that was defined wrong, so the database and the builder were designed against each other until both held up.',
        ],
      },
      {
        heading: 'Where it landed',
        body: [
          'The framework is complete as a design tool; no physical installation has run on it. What it settled for me is worth more than a single install: a good component grammar is a design deliverable, not an engineering byproduct, and giving non-engineers a legible model of a technical system changes who gets to design with it. That conviction runs through everything I have built since, including the design systems work at Futurity.',
        ],
      },
    ],
  },
  {
    title: 'Lab Equipment Portal',
    description:
      'Real-time equipment tracking with QR check-out, connecting a live status board to a physical lab. The project that pivoted my career from hardware to software.',
    meta: '2021 — Full Stack Development',
    category: 'AI-Native Interfaces',
    categorySlug: 'apps-systems',
    image: '/images/projects/lab-equipment-portal/cover.jpg',
    slug: 'lab-equipment-portal',
    accent: 'accent-1',
    tags: ['Full Stack', 'React', 'Node.js', 'GraphQL'],
    facts: {
      role: 'Designer & Developer, solo',
      year: '2021',
      stack: 'React, Node.js, GraphQL',
      company: 'Pensar Development',
    },
    caseStudy: [
      {
        heading: 'The brief',
        body: [
          'I ran the product-development lab at Pensar Development, a consultancy where engineering teams shared a finite pool of equipment: test gear, tools, benches. There was no formal tracking. In practice, finding an oscilloscope meant posting in a Teams group and hoping whoever had it read the message. I was the person that system failed on, because managing the equipment was my job.',
        ],
      },
      {
        heading: 'Asana before code',
        body: [
          'Before writing any software I bent an existing tool into shape: an Asana board with a task per equipment item, columns for status, borrowers as assignees, calibration documents attached to each task. It worked, and that was the point. The workaround proved what a real system needed: live status per item, a clear owner, and the paperwork attached to the thing itself.',
          'It also showed where a workaround tops out. The board only agreed with the room if everyone did their Asana chores. The fix had to make updating the record part of physically taking the equipment.',
        ],
      },
      {
        heading: 'QR codes, one source of truth',
        body: [
          'So in 2021 I built the portal: every piece of equipment became a record with a live status, free or in use, and got a QR code on the device itself. Scanning it checks the item out or shows its status. The board on screen and the shelf in the lab describe the same reality because updating the record is part of picking the thing up.',
          'A proper reservation system for future bookings stayed on the roadmap and never got built. The core loop, scan, take, return, was the product.',
        ],
      },
      {
        heading: 'Every layer at once',
        body: [
          'This was my first end-to-end full-stack product. My background to that point was electronics, prototyping labs, test fixtures, and factory floors. I chose React, Node.js, and GraphQL partly because I wanted to learn them, which meant every layer was new at once: component state, API design, the database, deployment.',
          'The portal shipped to the whole engineering team, colleagues who would walk over to my desk when something broke. That compressed the feedback loop to hours, and there was no hiding behind a demo.',
        ],
      },
      {
        heading: 'The hinge',
        body: [
          'The portal did its job, but its real output was a career decision. Building it, I noticed the part I could not put down was not the plumbing. It was designing how people interact with a system: what the board shows, what checking something out feels like, where the interface and the physical room have to agree.',
          'I left hardware, did a Master’s in Interaction Design in Barcelona, and became a design engineer. Every AI tool I have built since traces back to this internal tool for a room full of test equipment. It is the hinge of the whole portfolio.',
        ],
      },
    ],
  },
  {
    title: 'Futures Garden',
    description:
      'An EU initiative exploring life in 2040 through conversations with digital souls: LLM-powered archetypes accessed via a physical Orb with NFC-enabled phygital objects.',
    meta: '2025 — Concept & Interaction Design · Futurity Systems',
    category: 'Experiences & Hardware',
    categorySlug: 'experiences',
    image: '/images/projects/futures-garden/cover.jpg',
    slug: 'futures-garden',
    accent: 'accent-2',
    tags: ['LLM', 'NFC', 'Physical Computing', 'EU Commission'],
    facts: {
      role: 'Concept & Interaction Design (team project)',
      year: '2025',
      stack: 'LLM voice agents (ElevenLabs), NFC phygital objects',
      company: 'Futurity Systems · EU initiative',
    },
    caseStudy: [
      {
        heading: 'The brief',
        body: [
          'Futures Garden is an EU initiative about making 2040 discussable. Instead of another foresight report, the idea was an immersive exhibit: you meet the future by talking to characters who already live there, digital souls with their own voices and points of view.',
          'This was a team project at Futurity Systems. My part was the concept stage; the build belongs to my colleagues.',
        ],
      },
      {
        heading: 'Objects as the interface',
        body: [
          'I worked on the shape of the exhibit as a whole and on the thread that ended up defining it: physical artefacts from the future as the interface. Early versions were wearable, backpacks and NFC-tagged objects that talked to your phone. The idea that survived every iteration was the tap: touch a future object and it starts a conversation. No screen, no menu, the tap carries all the meaning a UI would normally spell out.',
        ],
      },
      {
        heading: 'The Orb',
        body: [
          'The piece that resolved the concept came from a teammate: one physical Orb as the voice of the exhibit. The digital souls are LLM-powered archetypes speaking through voice agents built on ElevenLabs, and the NFC-tagged artefacts act as conversation keys. Tap an artefact on the Orb and its soul speaks.',
          'By the time the build started I had moved almost fully onto FAST, so the Orb hardware, the voice-agent implementation, and the final exhibit are the team’s work. The concept of talking to the future through its objects is the part I can honestly claim a share of.',
        ],
      },
      {
        heading: 'What it settled',
        body: [
          'Phygital interfaces live or die on how much meaning one physical gesture can carry. Getting the artefact-tap to feel like addressing a person, not scanning a barcode, was the whole design problem, and it was solved in the concept, before any hardware existed. That lesson, that the interaction model is the product, is the same one that runs through my software work.',
        ],
      },
    ],
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
