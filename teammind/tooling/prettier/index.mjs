/** @typedef  {import("prettier").Config} PrettierConfig */
/** @typedef {import("prettier-plugin-tailwindcss").PluginOptions} TailwindConfig */
/** @typedef  {import("@trivago/prettier-plugin-sort-imports").PluginConfig} SortImportsConfig */

/** @type { PrettierConfig | SortImportsConfig | TailwindConfig } */
const config = {
  tabWidth: 2,
  useTabs: false,
  semi: true,
  printWidth: 80,
  singleQuote: true,
  arrowParens: 'always',
  importOrder: [
    '/^(?!.*\\.css).*/',
    '^server-only$',
    '^react$',
    '^react-dom$',
    '^next$',
    '^next/(.*)$',
    '^@supabase/supabase-js$',
    '^@supabase/gotrue-js$',
    '<THIRD_PARTY_MODULES>',
    '^@tm/(.*)$', // package imports
    '^~/(.*)$', // app-specific imports
    '^[./]', // relative imports
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
};

export default config;
