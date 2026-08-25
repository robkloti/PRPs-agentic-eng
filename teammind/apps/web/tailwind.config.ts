import type { Config } from 'tailwindcss';

import baseConfig from '@tm/tailwind-config';

export default {
  // We need to append the path to the UI package to the content array so that
  // those classes are included correctly.
  content: [...baseConfig.content],
  presets: [baseConfig],
  theme: {
    extend: {
      colors: {
        'brand-purple': 'hsl(var(--brand-purple) / <alpha-value>)',
        'brand-blue': 'hsl(var(--brand-blue) / <alpha-value>)',
        'brand-coral': 'hsl(var(--brand-coral) / <alpha-value>)',
        'brand-gold': 'hsl(var(--brand-gold) / <alpha-value>)',
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
