// ============================================
// Categories
// ============================================
export const categories = [
  {
    number: '01',
    title: 'Apps & Systems',
    subtitle: 'Tools, platforms, and frameworks that power creation and exploration',
    description: 'Tools, platforms, and frameworks that power creation and exploration. Software that bridges digital interfaces with physical environments.',
    count: '3 projects',
    slug: 'apps-systems',
    accent: 'accent-1',
    image: 'https://images.unsplash.com/photo-1517778991803-3fa8c9341083?q=80&w=2412&auto=format&fit=crop'
  },
  {
    number: '02',
    title: 'Experiences',
    subtitle: 'Installations, environments, and interactions that bridge physical and digital space',
    description: 'Installations, environments, and interactions that bridge physical and digital space. Work that engages the body and senses.',
    count: '2 projects',
    slug: 'experiences',
    accent: 'accent-2',
    image: 'https://images.unsplash.com/photo-1707651020188-089db91f17fb?q=80&w=3024&auto=format&fit=crop'
  },
  {
    number: '03',
    title: 'Research',
    subtitle: 'Explorations in AI, futures thinking, and emerging technology',
    description: 'Explorations in AI, futures thinking, and emerging technology. Speculative and investigative work.',
    count: '1 project',
    slug: 'research',
    accent: 'accent-3',
    image: 'https://substack-post-media.s3.amazonaws.com/public/images/b0227a56-cc6e-416b-afff-967bf68221bc_529x514.png'
  }
];

// ============================================
// Case Studies by Category
// ============================================
export const caseStudies = {
  'apps-systems': [
    {
      title: 'FAST',
      description: 'A futures research and analysis platform bridging strategic foresight with collaborative workflows.',
      meta: '2024 — Frontend Development',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
      slug: 'fast'
    },
    {
      title: 'Immersive Experience Builder',
      description: 'A framework and visual tool for creating interactive, sensor-driven spatial experiences.',
      meta: '2023 — Framework Design',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2032&auto=format&fit=crop',
      slug: 'immersive-experience-builder'
    },
    {
      title: 'Lab Equipment Portal',
      description: 'Real-time equipment tracking and reservation system connecting digital interfaces to physical lab spaces.',
      meta: '2023 — Product Design',
      image: 'https://images.unsplash.com/photo-1581093458791-9d15482442f5?q=80&w=2070&auto=format&fit=crop',
      slug: 'lab-equipment-portal'
    }
  ],
  'experiences': [
    {
      title: 'Sensory Garden Installation',
      description: 'An interactive outdoor installation responding to movement, sound, and environmental conditions.',
      meta: '2024 — Installation Design',
      image: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=2080&auto=format&fit=crop',
      slug: 'sensory-garden'
    },
    {
      title: 'Haptic Narrative',
      description: 'A VR experience exploring touch and presence in virtual storytelling.',
      meta: '2023 — VR Experience',
      image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=2070&auto=format&fit=crop',
      slug: 'haptic-narrative'
    }
  ],
  'research': [
    {
      title: 'AI Collaboration Patterns',
      description: 'Investigating how designers and AI systems can develop shared creative languages.',
      meta: '2024 — Research',
      image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2065&auto=format&fit=crop',
      slug: 'ai-collaboration'
    }
  ]
};

// ============================================
// Pinned Items (Featured on Homepage)
// ============================================
export const pinnedItems = [
  {
    title: 'Immersive Experience Builder',
    description: 'A framework and visual tool for creating interactive, sensor-driven spatial experiences that respond to movement, sound, and environmental conditions.',
    category: 'Apps & Systems',
    slug: 'immersive-experience-builder',
    accent: 'accent-1',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2032&auto=format&fit=crop'
  },
  {
    title: 'FAST',
    description: 'A futures research and analysis platform bridging strategic foresight with collaborative workflows for teams exploring emerging scenarios.',
    category: 'Apps & Systems',
    slug: 'fast',
    accent: 'accent-1',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'
  }
];

// ============================================
// Contact Links
// ============================================
export const contactLinks = [
  {
    label: 'Email',
    value: 'carlton@example.com',
    href: 'mailto:carlton@example.com'
  },
  {
    label: 'LinkedIn',
    value: 'linkedin.com/in/carltonlindsay',
    href: 'https://linkedin.com/in/carltonlindsay'
  },
  {
    label: 'GitHub',
    value: 'github.com/carlton-l',
    href: 'https://github.com/carlton-l'
  },
  {
    label: 'Twitter',
    value: '@carltonlindsay',
    href: 'https://twitter.com/carltonlindsay'
  }
];

// ============================================
// About Page Content (Scaffold)
// ============================================
export const aboutContent = {
  intro: 'Creative technologist working at the intersection of design, engineering, and emerging technology.',
  bio: [
    '[Your bio content here. Talk about your background, what drives you, and the kind of work you\'re passionate about.]',
    '[Continue with more about your journey, approach to work, or philosophy.]',
    '[Any additional context about what you\'re currently focused on or exploring.]'
  ],
  experience: [
    {
      role: '[Role Title]',
      company: '[Company Name]',
      dates: '[Start Year] — [End Year or Present]'
    },
    {
      role: '[Role Title]',
      company: '[Company Name]',
      dates: '[Start Year] — [End Year]'
    },
    {
      role: '[Role Title]',
      company: '[Company Name]',
      dates: '[Start Year] — [End Year]'
    }
  ],
  skills: [
    'Skill 1',
    'Skill 2',
    'Skill 3',
    'Skill 4',
    'Skill 5',
    'Skill 6',
    'Skill 7',
    'Skill 8'
  ]
};

// ============================================
// Site Metadata
// ============================================
export const siteConfig = {
  name: 'Carlton Lindsay',
  title: 'Carlton Lindsay — Creative Technologist',
  description: 'Design and engineering at the intersection of physical and digital.',
  url: 'https://carlton-l.github.io',
  social: {
    linkedin: 'https://linkedin.com/in/carltonlindsay',
    github: 'https://github.com/carlton-l',
    twitter: 'https://twitter.com/carltonlindsay',
    email: 'carlton@example.com'
  }
};
