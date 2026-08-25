# GYST Website - PRP Package

This is a **PRP (Problem-Requirements-Plan)** package designed to be executed by Claude Code.

## What's Inside

```
gyst-website/
├── PRPs/
│   └── website-build.md      ← The PRP document (Claude Code follows this)
├── .claude/
│   └── skills/
│       ├── frontend-skill/
│       │   └── SKILL.md      ← Frontend patterns reference
│       └── integration-skill/
│           └── SKILL.md      ← Retell/GHL patterns reference
├── .env.example              ← Environment variables template
└── README.md                 ← This file
```

## How to Use

### 1. Open in Claude Code

```bash
cd gyst-website
claude
```

Or open the folder in VS Code / Cursor with Claude Code extension.

### 2. Tell Claude to Execute the PRP

```
Read the PRP in /PRPs/website-build.md and implement it step by step.
Use the skills in /.claude/skills/ for reference patterns.
Validate after each task before moving to the next.
```

### 3. Claude Code Will:

1. Read the PRP document
2. Reference the SKILL.md files for patterns
3. Execute tasks 1-15 sequentially
4. Run validation after each task
5. Build the complete website

### 4. After Completion

```bash
cp .env.example .env.local
# Add your Retell/GHL API keys
npm run dev
```

## Expected Output

A complete Next.js 14 website with:
- Animated Hero section (Motion.dev)
- Services section (GSAP ScrollTrigger)
- Case Studies section
- CTA + Footer
- Retell AI chat widget
- GHL chat widget (optional)
- Lenis smooth scrolling
- Dark theme

## The Wirasm Methodology

This package follows the PRP pattern from [github.com/Wirasm/PRPs-agentic-eng](https://github.com/Wirasm/PRPs-agentic-eng):

1. **Context is King** - All docs/patterns included in skills
2. **Validation Loops** - Each task has verification steps
3. **Information Dense** - Keywords and code patterns throughout
4. **Progressive Success** - Start simple, validate, enhance

## Getting API Keys

### Retell AI
1. Dashboard → Keys → + Add Key → Public Key
2. Set allowed domain (localhost for dev)
3. AI Agents → Copy Agent ID

### GoHighLevel
1. Sites → Chat Widget → Configure
2. Get Code → Copy widget-id from script
