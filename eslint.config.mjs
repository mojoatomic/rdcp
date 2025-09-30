import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'

export default defineConfig([
  {
    // ignore patterns (must be in a standalone object in flat config)
    ignores: ['dist/', '**/dist/**', 'dist-cjs/', '**/dist-cjs/**', 'coverage/', '**/coverage/**', 'node_modules/', '*.config.js', '*.config.ts'],
  },
  js.configs.recommended,
  {
    files: ['tests/**/*.ts', 'tests/**/*.js', '**/*.test.ts', '**/*.test.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly'
      }
    }
  },
  {
    // Linter options (avoid CI warnings from unused disables)
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        // typescript-eslint v8 recommended approach for type-aware rules
        projectService: true,
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        module: 'readonly',
        // timers
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        // web-compatible globals available in Node 18+
        fetch: 'readonly',
        // types namespace used in JSDoc/TS
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  // For repository root test files, disable projectService to avoid tsconfig include requirement
  {
    files: ['tests/**/*.{ts,js}'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
  },
  // For core package test files, disable projectService to avoid tsconfig include requirement
  {
    files: ['packages/rdcp-core/tests/**/*.{ts,js}'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
  },
  // Relax type-aware rules for tests when projectService is disabled
  {
    files: ['tests/**/*.{ts,js}', '**/*.test.{ts,js}'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
]
)
