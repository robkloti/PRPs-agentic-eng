# Frontend Skill - GYST Agency Websites

## Tech Stack Reference

### Core
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS 3.4+
- **Components**: shadcn/ui

### Animation
- **Motion.dev** (package: `framer-motion`): UI transitions, gestures
- **GSAP**: Scroll-triggered animations, timelines
- **Lenis**: Smooth scrolling

### UI Libraries (Copy-Paste)
- **Aceternity UI**: https://ui.aceternity.com/components
- **Magic UI**: https://magicui.design

---

## Patterns

### Tailwind Config (shadcn compatible)
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... other shadcn colors
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

### Global CSS (shadcn dark theme)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    /* ... */
  }
  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    /* ... */
  }
}

/* Lenis overrides */
html.lenis, html.lenis body { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
```

### Lenis + GSAP Setup
```tsx
"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
```

### Motion.dev Stagger Pattern
```tsx
"use client";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

export function AnimatedSection() {
  return (
    <motion.div variants={container} initial="hidden" animate="visible">
      <motion.h1 variants={item}>Title</motion.h1>
      <motion.p variants={item}>Content</motion.p>
    </motion.div>
  );
}
```

### GSAP ScrollTrigger Pattern
```tsx
"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function ScrollAnimatedSection() {
  const containerRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);

  useGSAP(() => {
    gsap.from(itemsRef.current, {
      y: 80,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 60%",
        toggleActions: "play none none reverse",
      },
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef}>
      {items.map((item, i) => (
        <div key={i} ref={(el) => { if (el) itemsRef.current[i] = el; }}>
          {item}
        </div>
      ))}
    </section>
  );
}
```

### Button Hover Pattern
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="px-8 py-4 rounded-full bg-white text-black"
>
  Click me
</motion.button>
```

---

## Critical Rules

1. **Always add 'use client'** to components using framer-motion, GSAP, or Lenis
2. **Always use useGSAP hook** instead of useEffect for GSAP animations
3. **Always register plugins**: `gsap.registerPlugin(ScrollTrigger)`
4. **Always sync Lenis**: `lenis.on("scroll", ScrollTrigger.update)`
5. **shadcn components**: Run `npx shadcn@latest add <name>` - don't create manually
