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

// Custom TypeScript config
const tsConfig = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // You can override or add custom rules here
      '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error for 'any'
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Specific config for test files
  {
    files: ['src/__tests__/**/*.ts', 'src/__tests__/**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' in tests
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests
      'no-console': 'off', // Allow console in tests
    },
  },
]

// Combine configs
const eslintConfig = [...baseConfig, ...tsConfig]

export default eslintConfig
