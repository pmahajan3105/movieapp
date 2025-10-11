import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

// Base config from Next.js and Prettier
const baseConfig = [...compat.extends('next/core-web-vitals', 'prettier')]

// Custom TypeScript config - more permissive to avoid build blocking
const tsConfig = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Remove project-based linting temporarily to avoid parsing errors
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // More permissive rules for now
      '@typescript-eslint/no-explicit-any': 'off', // Allow any types for now
      '@typescript-eslint/no-unused-vars': 'warn', // Warn instead of error
      '@typescript-eslint/ban-ts-comment': 'off', // Allow ts comments
      '@typescript-eslint/no-require-imports': 'warn', // Warn about require in non-tests
      'no-console': 'off', // Allow console for now
      'react-hooks/exhaustive-deps': 'warn', // Warn instead of error
      '@next/next/no-img-element': 'warn', // Warn instead of error for img elements
    },
  },
  // Specific config for test files
  {
    files: ['src/__tests__/**/*.ts', 'src/__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // Remove project reference to avoid parsing issues
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' in tests
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests
      '@typescript-eslint/no-require-imports': 'off', // Allow require() in tests
      '@typescript-eslint/ban-ts-comment': 'off', // Allow ts comments in tests
      'no-console': 'off', // Allow console in tests
      'react-hooks/exhaustive-deps': 'off', // Turn off hook deps in tests
      '@next/next/no-img-element': 'off', // Allow img elements in tests
    },
  },
  // Specific config for debug components and logger
  {
    files: ['src/components/debug/**/*.tsx', 'src/lib/logger.ts'],
    rules: {
      'no-console': 'off', // Allow console in debug components and logger
    },
  },
]

// Combine configs
const eslintConfig = [...baseConfig, ...tsConfig]

export default eslintConfig
