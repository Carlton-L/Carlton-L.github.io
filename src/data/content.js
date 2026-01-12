// ============================================
// Categories
// ============================================
export const categories = [
  {
    number: '01',
    title: 'Apps & Systems',
    subtitle:
      'Tools, platforms, and frameworks that power creation and exploration',
    description:
      'Tools, platforms, and frameworks that power creation and exploration. Software that bridges digital interfaces with physical environments.',
    count: '3 projects',
    slug: 'apps-systems',
    accent: 'accent-1',
    image: '/images/categories/apps-systems.jpg'
  },
  {
    number: '02',
    title: 'Experiences',
    subtitle:
      'Installations, environments, and interactions that bridge physical and digital space',
    description:
      'Installations, environments, and interactions that bridge physical and digital space. Work that engages the body and senses.',
    count: '4 projects',
    slug: 'experiences',
    accent: 'accent-2',
    image: '/images/categories/experiences.jpg'
  },
  {
    number: '03',
    title: 'Research',
    subtitle: 'Explorations in AI, futures thinking, and emerging technology',
    description:
      'Explorations in AI, futures thinking, and emerging technology. Speculative and investigative work.',
    count: '1 project',
    slug: 'research',
    accent: 'accent-3',
    image: '/images/categories/research.jpg'
  }
];

// ============================================
// Case Studies by Category
// ============================================
export const caseStudies = {
  'apps-systems': [
    {
      title: 'FAST',
      description:
        'A futures-as-a-service platform leveraging AI and network graph science for strategic foresight and scenario exploration.',
      meta: '2025 — Frontend Development & Product Design',
      image: '/images/projects/fast/cover.jpg',
      slug: 'fast'
    },
    {
      title: 'Immersive Experience Builder',
      description:
        'A framework and visual tool for creating interactive, sensor-driven spatial experiences.',
      meta: '2024 — Framework Design',
      image: '/images/projects/immersive-experience-builder/cover.jpg',
      slug: 'immersive-experience-builder'
    },
    {
      title: 'Lab Equipment Portal',
      description:
        'Real-time equipment tracking and reservation system connecting digital interfaces to physical lab spaces.',
      meta: '2021 — Full Stack Development',
      image: '/images/projects/lab-equipment-portal/cover.jpg',
      slug: 'lab-equipment-portal'
    }
  ],
  experiences: [
    {
      title: 'Futures Garden',
      description:
        'An EU initiative exploring life in 2040 through conversations with digital souls — LLM-powered archetypes accessed via a physical Orb with NFC-enabled phygital objects.',
      meta: '2024 — Experience Design & Prototyping',
      image: '/images/projects/futures-garden/cover.jpg',
      slug: 'futures-garden'
    },
    {
      title: 'Biomimetic Eye Prototype',
      description:
        'An animatronic eye mechanism exploring expressive robotic movement through custom mechanics, RGB illumination, and modular assembly.',
      meta: '2024 — Robotics & Prototyping',
      image: '/images/projects/biomimetic-eye/cover.jpg',
      slug: 'biomimetic-eye'
    },
    {
      title: 'Interactive Home Lighting',
      description:
        'A computer vision presence detection system that dynamically controls home lighting based on occupancy and movement.',
      meta: '2024 — Systems Design',
      image: '/images/projects/home-lighting/cover.jpg',
      slug: 'home-lighting'
    },
    {
      title: 'Synthetic Plant Exploration',
      description:
        'Revisiting BEAM robotics with modern components — creating simple, analog-driven robotic plants as an exploration of emergent behavior.',
      meta: '2024 — Robotics & Exploration',
      image: '/images/projects/synthetic-plant/cover.jpg',
      slug: 'synthetic-plant'
    }
  ],
  research: [
    {
      title: 'Skill Pathways',
      description:
        'Design research for an AI application that helps users learn new skills, with a focus on career transitions. Qualitative research exploring user needs and learning behaviors.',
      meta: '2024 — Design Research',
      image: '/images/projects/skill-pathways/cover.jpg',
      slug: 'skill-pathways'
    }
  ]
};

// ============================================
// Pinned Items (Featured on Homepage)
// ============================================
export const pinnedItems = [
  {
    title: 'Immersive Experience Builder',
    description:
      'A framework and visual tool for creating interactive, sensor-driven spatial experiences that respond to movement, sound, and environmental conditions.',
    category: 'Apps & Systems',
    slug: 'immersive-experience-builder',
    accent: 'accent-1',
    image: '/images/projects/immersive-experience-builder/cover.jpg'
  },
  {
    title: 'FAST',
    description:
      'A futures-as-a-service platform leveraging AI and network graph science for strategic foresight and scenario exploration.',
    category: 'Apps & Systems',
    slug: 'fast',
    accent: 'accent-1',
    image: '/images/projects/fast/cover.jpg'
  }
];

// ============================================
// Contact Links
// ============================================
export const contactLinks = [
  {
    label: 'Email',
    value: 'carlton@carlton.dev',
    href: 'mailto:carlton@carlton.dev'
  },
  {
    label: 'LinkedIn',
    value: 'linkedin.com/in/carltonl',
    href: 'https://linkedin.com/in/carltonl'
  },
  {
    label: 'GitHub',
    value: 'github.com/Carlton-L',
    href: 'https://github.com/Carlton-L'
  }
];

// ============================================
// About Page Content
// ============================================
export const aboutContent = {
  intro:
    'Creative technologist bridging hardware engineering, interaction design, and emerging technologies — with a focus on building things that work.',
  bio: [
    'I started my career deep in electronics — troubleshooting, repairing, and building hardware at the component level. Over a decade, I moved from service repair into product development, working on devices at companies like Apple and Pensar, where I built prototyping labs, designed test fixtures, and helped bring products like the Vision Pro from concept to reality.',
    "Along the way, I became increasingly drawn to the front end of the process — not just making things work, but designing how people interact with them. That led me to pursue a Master's in Interaction Design and shift toward design technology and frontend development. These days, I work across the full stack, with a particular focus on AI tools, futures research, and immersive technology.",
    "What hasn't changed is the impulse to make things. I love solving problems — both technical and creative — and I'm happiest when I can prototype an idea, test it, and refine it. I'm always exploring new technologies and looking for interesting projects at the edges of what's possible."
  ],
  experience: [
    {
      role: 'Design Technologist & Product Lead',
      company: 'Futurity Systems',
      dates: '2025 — Present'
    },
    {
      role: 'Hardware Engineer, Vision Products Group',
      company: 'Apple',
      dates: '2022 — 2023'
    },
    {
      role: 'Product Development Lab Manager',
      company: 'Pensar Development',
      dates: '2016 — 2022'
    },
    {
      role: 'Senior PCB Repair Technician',
      company: 'FUJIFILM SonoSite',
      dates: '2015 — 2016'
    },
    {
      role: 'Robotics Technician',
      company: 'Hydromax USA',
      dates: '2014 — 2015'
    }
  ],
  skills: [
    'AI & LLMs',
    'Immersive Technology (VR/AR)',
    'Futures Research',
    'Robotics',
    'Full Stack Development',
    'Rapid Prototyping',
    'CAD Modeling (SolidWorks)',
    'Product Design',
    'Systems Design',
    'UX Prototyping',
    'CNC Fabrication',
    'Cross-functional Collaboration'
  ]
};

// ============================================
// Site Metadata
// ============================================
export const siteConfig = {
  name: 'Carlton Lindsay',
  title: 'Carlton Lindsay — Creative Technologist & Frontend Developer',
  description: 'Building at the intersection of design and engineering.',
  url: 'https://carlton.dev',
  social: {
    linkedin: 'https://linkedin.com/in/carltonl',
    github: 'https://github.com/Carlton-L',
    email: 'carlton@carlton.dev'
  }
};
