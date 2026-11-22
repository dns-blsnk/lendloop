import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import convexPlugin from '@convex-dev/eslint-plugin';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Limits come from the coding standards in CLAUDE.md.
const MAX_COMPLEXITY = 10;
const MAX_DEPTH = 3;
const MAX_PARAMS = 4;
const MAX_FUNCTION_LINES = 60;
const MAX_COMPONENT_LINES = 120;
const MAX_FILE_LINES = 300;

const WEB = 'apps/web';
const CONVEX = 'packages/backend/convex';

const envMessage = 'Read configuration through the typed env module.';
const envRestrictions = [
  {
    selector: "MemberExpression[property.name='env'][object.name='process']",
    message: envMessage,
  },
  {
    selector: "MemberExpression[property.name='env'][object.property.name='process']",
    message: envMessage,
  },
  {
    // Computed access: process['env'].
    selector: "MemberExpression[property.value='env'][object.name='process']",
    message: envMessage,
  },
  {
    selector: "VariableDeclarator[init.name='process'] > ObjectPattern > Property[key.name='env']",
    message: envMessage,
  },
];

const envImportRestrictions = [
  { name: 'process', importNames: ['env'], message: envMessage },
  { name: 'node:process', importNames: ['env'], message: envMessage },
];

/**
 * Convex modules talk to each other only through their index.ts (and schema.ts reads their
 * tables.ts); every other file of a module is internal to it. One zone per module folder, built
 * from the folder list when the config loads (an editor's ESLint server needs a restart to see a
 * new module; CI always sees it).
 */
const SHARED_CONVEX_FOLDERS = new Set(['_generated', 'lib', 'domain', 'test']);
const convexEntries = readdirSync(join(import.meta.dirname, CONVEX), { withFileTypes: true });
const convexModules = convexEntries
  .filter((entry) => entry.isDirectory() && !SHARED_CONVEX_FOLDERS.has(entry.name))
  .map((entry) => entry.name);
const convexTopLevel = convexEntries
  .filter((entry) => entry.name !== '_generated' && !convexModules.includes(entry.name))
  .map((entry) => entry.name);
const convexModuleZones = convexModules.map((name) => ({
  target: [
    ...convexTopLevel.map((entry) => `${CONVEX}/${entry}`),
    ...convexModules.filter((other) => other !== name).map((other) => `${CONVEX}/${other}`),
  ],
  from: `${CONVEX}/${name}`,
  except: ['./index.ts', './tables.ts'],
  message: `Import it from ${name}/index.ts.`,
}));

const rawBuilderMessage =
  'Build functions with the wrappers in convex/functions.ts so every function declares who may call it.';

const sourceFiles = ['**/*.ts', '**/*.tsx'];
// Tests and demo seed data are fixtures: literal dates and offsets are the point.
const exemptFromLimits = ['**/*.spec.ts', '**/*.spec.tsx', '**/test/**', '**/convex/seed/**'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/convex/_generated/**',
      '**/next-env.d.ts',
      // Bodies of n8n Code nodes: they run inside n8n with its globals ($env, $input, top-level await).
      'n8n/src/code/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: globals.node,
    },
  },
  {
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          // Each package's own tsconfig, so the web app's `@/` alias resolves.
          project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
          noWarnOnMultipleProjects: true,
        }),
      ],
    },
    rules: {
      'import-x/no-cycle': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: sourceFiles,
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-nested-ternary': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      complexity: ['error', MAX_COMPLEXITY],
      'max-depth': ['error', MAX_DEPTH],
      'max-params': 'off',
      '@typescript-eslint/max-params': ['error', { max: MAX_PARAMS }],
      'max-lines': ['error', { max: MAX_FILE_LINES, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true },
      ],
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          enforceConst: true,
        },
      ],
      'no-restricted-syntax': ['error', ...envRestrictions],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true, 'ts-ignore': true },
      ],
      'import-x/no-default-export': 'error',
      'no-restricted-imports': ['error', { paths: envImportRestrictions }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
      ],
    },
  },
  {
    // Hooks live in .ts files too (slice `model/` and `api/` segments); check them as well.
    files: [`${WEB}/src/**/*.ts`],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['**/*.tsx'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: { react: { version: 'detect' } },
    languageOptions: { globals: globals.browser },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react/no-danger': 'error',
      'react/prop-types': 'off',
      'max-lines-per-function': [
        'error',
        { max: MAX_COMPONENT_LINES, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: [`${WEB}/**/*.{ts,tsx}`],
    plugins: { '@next/next': nextPlugin },
    settings: { next: { rootDir: `${WEB}/` } },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    files: exemptFromLimits,
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
      ],
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/max-params': 'off',
      'max-depth': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
    },
  },
  ...convexPlugin.configs.recommended,
  {
    files: [`${CONVEX}/**/*.ts`],
    rules: {
      '@convex-dev/no-filter-in-query': 'error',
      'import-x/no-restricted-paths': [
        'error',
        { basePath: import.meta.dirname, zones: convexModuleZones },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: envImportRestrictions,
          patterns: [
            {
              group: ['**/_generated/server'],
              importNames: [
                'query',
                'mutation',
                'action',
                'internalQuery',
                'internalMutation',
                'internalAction',
              ],
              message: rawBuilderMessage,
            },
          ],
        },
      ],
    },
  },
  {
    // The one place that turns the raw builders into access-checked wrappers.
    files: [`${CONVEX}/functions.ts`],
    rules: { 'no-restricted-imports': ['error', { paths: envImportRestrictions }] },
  },
  {
    // Only the env modules may touch process.env. Convex reads the auth config at deploy time.
    files: [`${WEB}/src/shared/config/env.ts`, `${CONVEX}/lib/env.ts`, `${CONVEX}/auth.config.ts`],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
      '@convex-dev/no-process-env': 'off',
    },
  },
  {
    // Frameworks that load these files expect a default export. The Next `app/` folder holds only
    // route files (pages, layouts, route handlers, metadata files) that re-export from `src/`.
    // Convex loads the schema, auth config, HTTP router and crons by default export.
    files: [
      '**/*.config.ts',
      '**/*.config.mts',
      `${WEB}/app/**/*.{ts,tsx}`,
      `${WEB}/proxy.ts`,
      `${CONVEX}/{schema,auth.config,http,crons}.ts`,
    ],
    rules: { 'import-x/no-default-export': 'off' },
  },
  prettier,
);
