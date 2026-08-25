# CLAUDE.md - Project Instructions

## Overview
This is a GYST agency website build. Execute the PRP in `/PRPs/website-build.md`.

## Before Starting
1. Read `/PRPs/website-build.md` completely
2. Read `/.claude/skills/frontend-skill/SKILL.md` for animation patterns
3. Read `/.claude/skills/integration-skill/SKILL.md` for widget patterns

## Execution Flow
1. Execute tasks 1-15 in order
2. Run validation after each task
3. Fix any errors before proceeding
4. Use patterns from SKILL.md files

## Key Commands
```bash
npm run build          # Validate build
npm run dev            # Run dev server
npx tsc --noEmit       # Type check
npx shadcn@latest add  # Add shadcn components
```

## Critical Reminders
- Add 'use client' to all animated components
- Use useGSAP hook, not useEffect for GSAP
- Register ScrollTrigger: `gsap.registerPlugin(ScrollTrigger)`
- Sync Lenis with GSAP: `lenis.on("scroll", ScrollTrigger.update)`
- Use NEXT_PUBLIC_ prefix for browser env vars
