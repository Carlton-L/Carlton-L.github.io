# Carlton Lindsay Portfolio

Personal portfolio website built with React, Vite, and deployed to GitHub Pages.

**Live site:** [carlton-l.github.io](https://carlton-l.github.io)

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [VS Code](https://code.visualstudio.com/) (recommended)
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/carlton-l/carlton-l.github.io.git
   cd carlton-l.github.io
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

### Deployment to GitHub Pages

```bash
npm run deploy
```

This builds the project and pushes the `dist` folder to the `main` branch.

---

## 📁 Project Structure

```
carlton-portfolio/
├── public/                    # Static assets
├── src/
│   ├── components/           # React components
│   │   ├── PlusIcons.jsx     # + icon corners
│   │   ├── TweenText.jsx     # Letter-by-letter animation
│   │   ├── Navigation.jsx    # Site navigation
│   │   ├── Footer.jsx        # Site footer
│   │   ├── PageLayout.jsx    # Page wrapper with transitions
│   │   ├── HeroCanvas.jsx    # Interactive hero background
│   │   ├── CategoryCard.jsx  # Category grid cards
│   │   ├── CaseStudyCard.jsx # Case study cards
│   │   ├── PinnedItem.jsx    # Pinned work items
│   │   ├── CategorySidebar.jsx
│   │   └── ContactLink.jsx
│   ├── pages/                # Page components
│   │   ├── HomePage.jsx
│   │   ├── CategoryPage.jsx
│   │   ├── AboutPage.jsx
│   │   ├── ContactPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── data/
│   │   └── content.js        # Site content & data
│   ├── styles/
│   │   └── index.css         # All styles
│   ├── App.jsx               # Routes & app shell
│   └── main.jsx              # Entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 🎨 Style Guide

### Colors

| Variable | Hex | Usage |
|----------|-----|-------|
| `--bg` | `#E8E8EA` | Main background |
| `--light-contrast` | `#F5F5F6` | Card/box backgrounds |
| `--dark-contrast` | `#E0E1E3` | Borders, hover backgrounds |
| `--accent-1` | `#252FF1` | Blue — Apps & Systems |
| `--accent-2` | `#F7C385` | Orange — Experiences |
| `--accent-3` | `#EE6D71` | Coral/Red — Research |
| `--text` | `#040407` | Primary text |
| `--text-light` | `#A9ADBA` | Secondary/muted text |

### Typography

| Font | Weights | Usage |
|------|---------|-------|
| **Spline Sans** | 300, 400, 500, 600 | Body text, headings, descriptions |
| **JetBrains Mono** | 300, 400, 500 | Navigation, labels, numbers, code-like elements |

#### Type Scale

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page title | Spline Sans | 2.5rem | 500 |
| Card title | Spline Sans | 1.125rem | 500 |
| Body text | Spline Sans | 1rem | 400 |
| Nav links | JetBrains Mono | 0.75rem | 400 |
| Meta/labels | JetBrains Mono | 0.6875rem | 400 |
| Logo | JetBrains Mono | 0.75rem | 400, uppercase |

### Spacing

- Nav padding: `0.75rem` (desktop), `0.5rem` (mobile)
- Content max-width: `1000px` (standard), `1400px` (wide/category pages)
- Section padding: `4-6rem` vertical
- Card padding: `1rem 1.25rem`

### Components

#### Plus Icons
Signature element — `+` icons at box corners.

```jsx
import { PlusIcons } from './components/PlusIcons';

<div className="box-with-plus" style={{ position: 'relative' }}>
  <PlusIcons />
  {/* content */}
</div>
```

#### Tween Text
Letter-by-letter reveal animation on hover.

```jsx
import TweenText from './components/TweenText';

<TweenText text="Hover me" />
```

### Interaction Patterns

| Interaction | Effect |
|-------------|--------|
| Card hover | `box-shadow: inset 0 0 0 1px var(--text)` |
| Arrow hover | `transform: translate(4px, -4px)` + accent color |
| Background hover | Transition from `--light-contrast` to `--bg` |
| Link hover | Background color change to `--dark-contrast` |

### Animations

```css
/* Page entrance */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Timing */
transition: all 0.3s ease;  /* Standard */
transition: all 0.2s ease;  /* Quick feedback */
cubic-bezier(0.4, 0, 0.2, 1) /* Smooth motion */
```

### Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| `≤1000px` | Category sidebar moves to top |
| `≤900px` | Grid becomes single column, hero shrinks |
| `≤600px` | Nav stacks, mobile spacing, touch optimizations |

---

## 📝 Editing Content

All site content is centralized in `src/data/content.js`:

- **Categories** — Portfolio category cards
- **Case Studies** — Projects within each category
- **Pinned Items** — Featured projects on homepage
- **Contact Links** — Social/contact links
- **About Content** — Bio, experience, skills
- **Site Config** — Metadata, social links

### Adding a New Project

1. Add to `caseStudies` in `content.js`:
   ```js
   'apps-systems': [
     // ... existing
     {
       title: 'New Project',
       description: 'Project description',
       meta: '2024 — Role',
       image: 'https://...',
       slug: 'new-project'
     }
   ]
   ```

2. Optionally add to `pinnedItems` to feature on homepage.

---

## 🛠 Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router v6 (HashRouter)
- **Animations:** Framer Motion
- **SEO:** React Helmet Async
- **Utilities:** clsx
- **Deployment:** GitHub Actions to GitHub Pages (`.github/workflows/deploy.yml`)

---

## 📄 License

MIT
