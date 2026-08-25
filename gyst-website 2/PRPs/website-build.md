name: "GYST Agency Website with Retell AI & GHL Integration"
description: |

## Purpose
Build a premium AI agency website for GYST using Next.js 14 (App Router), shadcn/ui, Motion.dev, and GSAP. Embed Retell AI voice/chat widget and GoHighLevel chatbot. This demonstrates the Claude Skills pattern with modern frontend stack.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance

---

## Goal
Create a production-ready agency website where:
- Homepage has animated Hero, Services, Case Studies, and CTA sections
- Retell AI chat/voice widget embedded for visitor interaction
- GoHighLevel chat widget for lead capture
- Smooth scroll with Lenis, GSAP ScrollTrigger animations
- shadcn/ui components with Aceternity-style effects

## Why
- **Business value**: Professional web presence for GYST AI agency
- **Integration**: Demonstrates Retell + GHL embed patterns
- **Reusability**: Skills created here apply to future client builds
- **Problems solved**: Replaces vibe-coded site with production-quality build

## What
A Next.js 14 website where:
- Dark theme, modern agency aesthetic
- Motion.dev for UI transitions and gestures
- GSAP for scroll-triggered section animations
- Lenis for smooth scrolling
- Retell AI widget (chat mode) for AI conversations
- GHL widget for SMS/lead capture
- Environment-based configuration for API keys

### Success Criteria
- [ ] Next.js 14 App Router project runs without errors
- [ ] shadcn/ui initialized with dark theme
- [ ] Lenis smooth scroll working
- [ ] Hero section with Motion.dev stagger animations
- [ ] Services section with GSAP ScrollTrigger
- [ ] Retell widget loads and displays chat bubble
- [ ] GHL widget loads (when configured)
- [ ] Mobile responsive (375px, 768px, 1024px breakpoints)
- [ ] Lighthouse Performance > 90

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- skill: /.claude/skills/frontend-skill/SKILL.md
  why: Tech stack patterns, component library references, animation setup

- skill: /.claude/skills/integration-skill/SKILL.md
  why: Retell AI and GHL embed code patterns

- url: https://nextjs.org/docs/app
  why: App Router patterns, server vs client components

- url: https://ui.shadcn.com/docs/installation/next
  why: shadcn initialization for Next.js

- url: https://motion.dev/docs/react-quick-start
  why: Motion.dev setup and basic animations

- url: https://gsap.com/docs/v3/GSAP/gsap.from()
  why: GSAP animation methods

- url: https://gsap.com/resources/React/
  why: useGSAP hook for React integration

- url: https://docs.retellai.com/deploy/chat-widget
  why: Retell widget embed code

- url: https://help.gohighlevel.com/support/solutions/articles/48000984860
  why: GHL chat widget installation
```

### Current Codebase Structure
```bash
.
├── PRPs/
│   └── website-build.md       # This file
├── .claude/
│   └── skills/
│       ├── frontend-skill/
│       │   └── SKILL.md       # Frontend patterns
│       └── integration-skill/
│           └── SKILL.md       # Retell/GHL patterns
├── .env.example               # Environment template
└── README.md                  # Setup instructions
```

### Desired Codebase Structure (After Implementation)
```bash
.
├── PRPs/
│   └── website-build.md
├── .claude/
│   └── skills/
│       ├── frontend-skill/
│       │   └── SKILL.md
│       └── integration-skill/
│           └── SKILL.md
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Home page
│   │   └── globals.css             # Tailwind + custom styles
│   ├── components/
│   │   ├── ui/                     # shadcn components (auto-generated)
│   │   ├── providers/
│   │   │   └── LenisProvider.tsx   # Smooth scroll provider
│   │   ├── sections/
│   │   │   ├── Hero.tsx            # Animated hero
│   │   │   ├── Services.tsx        # GSAP scroll-triggered
│   │   │   ├── CaseStudies.tsx     # Case study cards
│   │   │   └── CTA.tsx             # Call to action + footer
│   │   └── integrations/
│   │       ├── RetellWidget.tsx    # Retell embed component
│   │       └── GHLChatWidget.tsx   # GHL embed component
│   └── lib/
│       └── utils.ts                # cn() helper
├── public/
│   └── .gitkeep
├── .env.example
├── .env.local                      # Actual keys (gitignored)
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### Known Gotchas & Library Quirks
```python
# CRITICAL: 'use client' directive required for all animated components
# CRITICAL: useGSAP hook (not useEffect) for GSAP to prevent memory leaks
# CRITICAL: Lenis must sync with ScrollTrigger via lenis.on('scroll', ScrollTrigger.update)
# CRITICAL: gsap.registerPlugin(ScrollTrigger) must run before any ScrollTrigger usage
# CRITICAL: Motion.dev is the new name for Framer Motion - package is still 'framer-motion'
# CRITICAL: shadcn components go in src/components/ui/ - run 'npx shadcn@latest add <component>'
# CRITICAL: Retell widget needs data-public-key and data-agent-id at minimum
# CRITICAL: Next.js Script component needs strategy="afterInteractive" for widgets
# CRITICAL: Environment variables exposed to browser need NEXT_PUBLIC_ prefix
```

---

## Implementation Blueprint

### Task 1: Initialize Next.js Project
```yaml
CREATE: Next.js 14 project with TypeScript and Tailwind
COMMANDS:
  - npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --use-npm
  - Overwrite existing files when prompted (Y)
VALIDATE:
  - npm run dev works
  - localhost:3000 shows Next.js default page
```

### Task 2: Install Dependencies
```yaml
INSTALL: Animation and UI dependencies
COMMANDS:
  - npm install framer-motion gsap @gsap/react lenis
  - npm install clsx tailwind-merge
  - npm install lucide-react
  - npm install tailwindcss-animate
  - npm install @radix-ui/react-slot
VALIDATE:
  - npm run build succeeds
  - No peer dependency warnings
```

### Task 3: Initialize shadcn/ui
```yaml
COMMANDS:
  - npx shadcn@latest init
  - Select: New York style, Neutral color, CSS variables: yes
  - npx shadcn@latest add button
VALIDATE:
  - src/components/ui/button.tsx exists
  - src/lib/utils.ts has cn() function
```

### Task 4: Configure Tailwind
```yaml
UPDATE: tailwind.config.ts
PATTERN: Read /.claude/skills/frontend-skill/SKILL.md for config
INCLUDE:
  - Dark mode: class
  - CSS variable colors for shadcn
  - Animation keyframes (fade-in, fade-up, shimmer)
  - tailwindcss-animate plugin
VALIDATE:
  - npm run build succeeds
```

### Task 5: Create Global Styles
```yaml
UPDATE: src/app/globals.css
INCLUDE:
  - Tailwind directives
  - CSS variables for light/dark (shadcn pattern)
  - Lenis smooth scroll overrides
  - Custom utilities (gradient-text, glass, glow)
VALIDATE:
  - npm run dev shows styled page
```

### Task 6: Create Lenis Provider
```yaml
CREATE: src/components/providers/LenisProvider.tsx
PATTERN: Read /.claude/skills/frontend-skill/SKILL.md
INCLUDE:
  - 'use client' directive
  - Lenis initialization with easing
  - GSAP ScrollTrigger sync
  - Cleanup on unmount
VALIDATE:
  - No console errors
  - Smooth scroll works on page
```

### Task 7: Create Retell Widget Component
```yaml
CREATE: src/components/integrations/RetellWidget.tsx
PATTERN: Read /.claude/skills/integration-skill/SKILL.md
INCLUDE:
  - 'use client' directive
  - Next.js Script component
  - Props for mode (chat/callback), publicKey, agentId
  - Optional reCAPTCHA support
  - Null check if missing required props
VALIDATE:
  - Component renders without error
  - No TypeScript errors
```

### Task 8: Create GHL Widget Component
```yaml
CREATE: src/components/integrations/GHLChatWidget.tsx
PATTERN: Read /.claude/skills/integration-skill/SKILL.md
INCLUDE:
  - 'use client' directive
  - Next.js Script with lazyOnload strategy
  - Props for widgetId
VALIDATE:
  - Component renders without error
```

### Task 9: Create Root Layout
```yaml
UPDATE: src/app/layout.tsx
INCLUDE:
  - Inter font from next/font/google
  - LenisProvider wrapper
  - RetellWidget in body (reads from env vars)
  - Metadata for SEO
  - Dark mode class on html
VALIDATE:
  - npm run dev shows page with smooth scroll
```

### Task 10: Create Hero Section
```yaml
CREATE: src/components/sections/Hero.tsx
PATTERN: Read /.claude/skills/frontend-skill/SKILL.md
INCLUDE:
  - 'use client' directive
  - Motion.dev containerVariants and itemVariants
  - Staggered animation on mount
  - Gradient background with grid overlay
  - "Get Your Stack Together" headline
  - Two CTA buttons with whileHover/whileTap
  - Stats row (50+ AI Systems, 10x Efficiency, 24/7)
  - Scroll indicator animation
VALIDATE:
  - Animations play on page load
  - Buttons have hover states
```

### Task 11: Create Services Section
```yaml
CREATE: src/components/sections/Services.tsx
INCLUDE:
  - 'use client' directive
  - useGSAP hook for scroll animations
  - gsap.registerPlugin(ScrollTrigger)
  - useRef for container and cards
  - gsap.from with stagger on scroll
  - 4 service cards: RAG, Voice AI, Automation, Multi-Agent
  - Hover effects with group class
VALIDATE:
  - Cards animate in on scroll
  - Hover states work
```

### Task 12: Create Case Studies Section
```yaml
CREATE: src/components/sections/CaseStudies.tsx
INCLUDE:
  - 'use client' directive
  - Motion.dev useInView for scroll trigger
  - 3 case study cards with metrics
  - Staggered reveal animation
VALIDATE:
  - Cards animate on scroll into view
```

### Task 13: Create CTA Section
```yaml
CREATE: src/components/sections/CTA.tsx
INCLUDE:
  - 'use client' directive
  - Motion.dev animations
  - Two CTA buttons
  - Trust indicators
  - Footer with links
VALIDATE:
  - Section renders correctly
```

### Task 14: Create Home Page
```yaml
UPDATE: src/app/page.tsx
INCLUDE:
  - Import all sections
  - Render: Hero, Services, CaseStudies, CTA
VALIDATE:
  - Full page renders
  - All animations work
  - Scroll is smooth
```

### Task 15: Environment Configuration
```yaml
CREATE: .env.example (if not exists)
UPDATE: Contents with all NEXT_PUBLIC_ variables
CREATE: .gitignore with .env.local
VALIDATE:
  - .env.example has all required variables documented
```

---

## Per-Task Pseudocode

### Task 6: Lenis Provider
```tsx
"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function LenisProvider({ children }) {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2 });
    
    // CRITICAL: Sync with ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);
    
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    
    return () => lenis.destroy();
  }, []);
  
  return <>{children}</>;
}
```

### Task 10: Hero with Motion.dev
```tsx
"use client";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
};

export function Hero() {
  return (
    <motion.section variants={containerVariants} initial="hidden" animate="visible">
      <motion.h1 variants={itemVariants}>Get Your Stack Together</motion.h1>
      {/* ... */}
    </motion.section>
  );
}
```

### Task 11: Services with GSAP
```tsx
"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function Services() {
  const containerRef = useRef(null);
  const cardsRef = useRef([]);
  
  useGSAP(() => {
    gsap.from(cardsRef.current, {
      y: 80,
      opacity: 0,
      stagger: 0.15,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 60%",
      }
    });
  }, { scope: containerRef });
  
  return (
    <section ref={containerRef}>
      {services.map((s, i) => (
        <div ref={el => cardsRef.current[i] = el} key={s.title}>
          {/* ... */}
        </div>
      ))}
    </section>
  );
}
```

---

## Validation Loop

### Level 1: Syntax & Build
```bash
# Run after each task
npm run build
npx tsc --noEmit

# Expected: No errors. If errors, READ output and fix.
```

### Level 2: Visual Check
```bash
npm run dev
# Open localhost:3000
# Check:
#   - Page loads without console errors
#   - Smooth scroll works
#   - Hero animations play
#   - Services animate on scroll
#   - Retell widget bubble appears (if env vars set)
```

### Level 3: Responsive Check
```bash
# In browser DevTools, test:
#   - 375px (mobile)
#   - 768px (tablet)
#   - 1024px (desktop)
#   - 1440px (large desktop)
# All sections should be readable and usable
```

### Level 4: Performance
```bash
# Run Lighthouse audit in Chrome DevTools
# Target: Performance > 90, Accessibility > 95
```

---

## Final Validation Checklist
- [ ] `npm run build` succeeds with no errors
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Lenis smooth scroll working
- [ ] Hero animations play on load
- [ ] Services cards animate on scroll
- [ ] Case studies animate on scroll
- [ ] CTA section renders
- [ ] Retell widget loads (with valid env vars)
- [ ] Mobile responsive at 375px
- [ ] Lighthouse Performance > 90
- [ ] All environment variables documented in .env.example

---

## Anti-Patterns to Avoid
- ❌ Don't use useEffect for GSAP - use useGSAP hook
- ❌ Don't forget 'use client' on animated components
- ❌ Don't hardcode API keys - use NEXT_PUBLIC_ env vars
- ❌ Don't import from 'framer-motion' without 'use client'
- ❌ Don't skip gsap.registerPlugin(ScrollTrigger)
- ❌ Don't forget Lenis/ScrollTrigger sync
- ❌ Don't use strategy="beforeInteractive" for widget scripts
- ❌ Don't commit .env.local to git

---

## Confidence Score: 9/10

High confidence due to:
- Well-documented Next.js App Router patterns
- Established animation library ecosystems (Motion.dev, GSAP)
- Clear Retell/GHL embed documentation
- Step-by-step validation at each task

Minor uncertainty:
- GHL widget ID retrieval depends on account setup
- Retell requires active agent to test properly
