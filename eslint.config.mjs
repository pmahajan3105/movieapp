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
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // You can override or add custom rules here
      '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error for 'any'
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]

// Combine configs
const eslintConfig = [...baseConfig, ...tsConfig]

export default eslintConfig
