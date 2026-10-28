import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.aws-sam/**', '**/coverage/**', '.local/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['apps/api/**/*.js', 'packages/**/*.js', '*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['apps/web/**/*.{js,jsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['apps/web/vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['apps/web/**/*.test.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
];
