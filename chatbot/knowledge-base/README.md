# Knowledge Base

This directory contains the source material for Carlton's digital twin chatbot. Each markdown file is chunked and embedded into the vector database. The chatbot can ONLY answer based on information in these files.

## Structure

```
knowledge-base/
├── 01-background.md        # Professional bio, career narrative
├── 02-experience.md        # Work history with details per role
├── 03-skills.md            # Technical skills with proficiency context
├── 04-projects/            # One file per project case study
│   ├── fast.md
│   ├── immersive-experience-builder.md
│   ├── futures-garden.md
│   ├── biomimetic-eye.md
│   ├── home-lighting.md
│   ├── synthetic-plant.md
│   ├── lab-equipment-portal.md
│   └── skill-pathways.md
├── 05-philosophy.md        # Design philosophy, approach, values
├── 06-education.md         # Education and continuing learning
├── 07-personality.md       # Fun facts, interests, working style
└── 08-faq.md              # Common questions with ideal answers
```

## Guidelines for Writing Entries

1. **Write in first person** — The chatbot speaks as Carlton. Write "I built..." not "Carlton built..."
2. **Be specific** — Include dates, technologies, team sizes, outcomes. Vague entries produce vague answers.
3. **One topic per section** — Use `## Headings` to separate topics within a file. Each heading becomes a retrievable chunk.
4. **Include metadata** — Each file has frontmatter with `topic`, `keywords`, and `last_updated` fields.
5. **Err on the side of inclusion** — If something might be asked about, document it. The chatbot can only cite what's here.
6. **Update regularly** — When you finish a new project or learn a new skill, add it here.
