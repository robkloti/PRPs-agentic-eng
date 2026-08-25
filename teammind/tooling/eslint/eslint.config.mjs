import js from '@eslint/js';
// @ts-ignore TODO types will come in next next.js release
import nextPlugin from '@next/eslint-plugin-next';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import * as importPlugin from 'eslint-plugin-import-x';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import turboPlugin from 'eslint-plugin-turbo';

// Base configuration
const baseConfig = [
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    ignores: [
      '**/.eslintrc.cjs',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/node_modules',
      '.next',
      'dist',
      'pnpm-lock.yaml',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: true,
        ecmaFeatures: {
          jsx: true, // Make sure this is enabled for JSX
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import-x': importPlugin,
      turbo: turboPlugin,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
        }),
      ],
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-misused-promises': [
        2,
        { checksVoidReturn: { attributes: false } },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-i18next',
              importNames: ['Trans'],
              message: 'Please use `@tm/ui/trans` instead',
            },
          ],
        },
      ],
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  // Include TypeScript's recommended and stylistic rules
  tseslint.configs['recommended-type-checked'],
  tseslint.configs['stylistic-type-checked'],
  eslintConfigPrettier,
];

// React configuration - enhanced for better TSX support
const reactConfig = {
  files: ['**/*.{jsx,tsx}'],
  languageOptions: {
    globals: {
      React: 'writable',
    },
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  plugins: {
    react: reactPlugin,
    'react-hooks': reactHooksPlugin,
  },
  rules: {
    ...reactPlugin.configs.recommended.rules,
    ...reactHooksPlugin.configs.recommended.rules,
    'react/prop-types': 'off',
    // Additional useful rules for JSX/TSX formatting
    'react/jsx-boolean-value': ['error', 'never'],
    'react/jsx-curly-brace-presence': [
      'error',
      { props: 'never', children: 'never' },
    ],
    'react/jsx-curly-spacing': ['error', { when: 'never', children: true }],
    'react/jsx-equals-spacing': ['error', 'never'],
    'react/jsx-indent': ['error', 2],
    'react/jsx-indent-props': ['error', 2],
    'react/jsx-tag-spacing': [
      'error',
      {
        closingSlash: 'never',
        beforeSelfClosing: 'always',
        afterOpening: 'never',
        beforeClosing: 'never',
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};

// Next.js configuration
const nextjsConfig = {
  files: ['**/*.{js,jsx,ts,tsx}'], // Make sure this includes tsx
  plugins: {
    '@next/next': nextPlugin,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    '@next/next/no-html-link-for-pages': 'off',
  },
};

// Apps-specific configuration
const appsConfig = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@tm/supabase/database',
            importNames: ['Database'],
            message:
              'Please use the application types from your app "~/lib/database.types" instead',
          },
        ],
      },
    ],
  },
};

export default [...baseConfig, reactConfig, nextjsConfig, appsConfig];
