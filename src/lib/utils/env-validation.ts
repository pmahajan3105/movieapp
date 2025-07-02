/**
 * Safe environment variable access with validation
 */

import { EnvironmentError } from '@/lib/errors'

/**
 * Safely get a required environment variable
 * @param name Environment variable name
 * @param fallback Optional fallback value
 * @returns The environment variable value
 * @throws EnvironmentError if the variable is not set and no fallback provided
 */
export function getRequiredEnvVar(name: string, fallback?: string): string {
  const value = process.env[name]

  if (!value && !fallback) {
    throw new EnvironmentError(name)
  }

  return value || fallback!
}

/**
 * Safely get an optional environment variable
 * @param name Environment variable name
 * @param fallback Default value if not set
 * @returns The environment variable value or fallback
 */
export function getOptionalEnvVar(name: string, fallback: string = ''): string {
  return process.env[name] || fallback
}

/**
 * Validate that required environment variables are set
 * @param envVars Array of required environment variable names
 * @throws EnvironmentError if any required variable is missing
 */
export function validateRequiredEnvVars(envVars: string[]): void {
  const missing = envVars.filter(name => !process.env[name])

  if (missing.length > 0) {
    throw new EnvironmentError(
      missing[0] || 'unknown',
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
}

/**
 * Parse a number from environment variable with validation
 * @param name Environment variable name
 * @param fallback Default value if not set or invalid
 * @returns Parsed number
 */
export function getEnvNumber(name: string, fallback: number): number {
  const value = process.env[name]

  if (!value) return fallback

  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Parse a boolean from environment variable
 * @param name Environment variable name
 * @param fallback Default value if not set
 * @returns Parsed boolean
 */
export function getEnvBoolean(name: string, fallback: boolean = false): boolean {
  const value = process.env[name]?.toLowerCase()

  if (!value) return fallback

  return value === 'true' || value === '1' || value === 'yes'
}

/**
 * Safe string parsing utilities
 */
export class SafeParser {
  /**
   * Safely parse an integer from a string with validation
   * @param input String to parse
   * @param fallback Default value if parsing fails
   * @param min Minimum allowed value
   * @param max Maximum allowed value
   * @returns Parsed and validated integer
   */
  static parseInt(
    input: string | undefined | null,
    fallback: number,
    min?: number,
    max?: number
  ): number {
    if (!input || typeof input !== 'string') return fallback

    const parsed = parseInt(input.trim(), 10)

    if (isNaN(parsed)) return fallback

    if (min !== undefined && parsed < min) return fallback
    if (max !== undefined && parsed > max) return fallback

    return parsed
  }

  /**
   * Safely parse a float from a string with validation
   * @param input String to parse
   * @param fallback Default value if parsing fails
   * @param min Minimum allowed value
   * @param max Maximum allowed value
   * @returns Parsed and validated float
   */
  static parseFloat(
    input: string | undefined | null,
    fallback: number,
    min?: number,
    max?: number
  ): number {
    if (!input || typeof input !== 'string') return fallback

    const parsed = parseFloat(input.trim())

    if (isNaN(parsed)) return fallback

    if (min !== undefined && parsed < min) return fallback
    if (max !== undefined && parsed > max) return fallback

    return parsed
  }

  /**
   * Safely extract a value from a regex match
   * @param match RegExpMatchArray or null
   * @param index Index to extract (default 1)
   * @param fallback Default value if extraction fails
   * @returns Extracted string or fallback
   */
  static extractMatch(
    match: RegExpMatchArray | null,
    index: number = 1,
    fallback: string = ''
  ): string {
    if (!match || !match[index]) return fallback
    return match[index].trim()
  }
}
