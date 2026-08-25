import type { Config } from 'tailwindcss';
import tailwindCssAnimate from 'tailwindcss-animate';
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  darkMode: ['class'],
  content: [
    '../../packages/**/*.tsx',
    '../../apps/**/*.tsx',
    '!../../packages/**/node_modules',
    '!../../apps/**/node_modules',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      borderColor: {
        DEFAULT: 'hsl(var(--border) / <alpha-value>)',
      },
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: '#E74C3C',
          foreground: '#FFFFFF',
          light: '#FADBD8',
          dark: '#C0392B',
        },
        error: {
          DEFAULT: '#F5A9A0', // Same as destructive
          foreground: '#FFFFFF',
          light: '#FADDDA',
          dark: '#E07A6E',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: '#5BBB7B', // Green that complements the logo colors
          foreground: '#FFFFFF',
          light: '#DEF0E4',
          dark: '#3D9A5D',
        },
        warning: {
          DEFAULT: '#E6D3A7', // Updated to a softer gold color
          foreground: '#1F2937',
          light: '#FBF2D9',
          dark: '#CBAA68',
        },
        info: {
          DEFAULT: '#8C9CFF', // Updated to match logo's blue/lavender color
          foreground: '#FFFFFF',
          light: '#E5E9FF',
          dark: '#6E80E2',
        },
        purple: {
          DEFAULT: '#8C9CFF', // Updated to match logo's lavender color
          foreground: '#FFFFFF',
          light: '#E5E9FF',
          dark: '#6E80E2',
        },
        coral: {
          DEFAULT: '#F5A9A0', // Logo's salmon/coral color
          foreground: '#FFFFFF',
          light: '#FADDDA',
          dark: '#E07A6E',
        },
        gold: {
          DEFAULT: '#E6D3A7', // Softer version of logo's gold/yellow color
          foreground: '#1F2937',
          light: '#FBF2D9',
          dark: '#CBAA68',
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0, 0, 0, 0.05)',
        medium: '0 4px 20px rgba(0, 0, 0, 0.08)',
        card: '0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02)',
        button: '0 2px 6px rgba(0, 0, 0, 0.06)',
        focus: '0 0 0 2px rgba(140, 156, 255, 0.4)', // Uses primary brand color
      },
      fontFamily: {
        cal: ['var(--font-cal)', ...fontFamily.sans],
        sans: ['-apple-system', 'var(--font-sans)', ...fontFamily.sans],
        heading: ['var(--font-heading)'],
      },
      keyframes: {
        'fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '80%': {
            opacity: '0.6',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0px)',
          },
        },
        'fade-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)',
          },
          '80%': {
            opacity: '0.6',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0px)',
          },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s',
        'fade-down': 'fade-down 0.5s',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindCssAnimate],
} satisfies Config;
