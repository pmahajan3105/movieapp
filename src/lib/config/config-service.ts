/**
 * ConfigService - Configuration Management for CineAI Personal Mode
 *
 * Manages the config.json file in ~/.cineai/
 * Handles API keys, user preferences, and app settings
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

// Config file location
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.cineai')
const CONFIG_FILENAME = 'config.json'

export interface CineAIConfig {
  version: string
  setup_completed: boolean
  taste_onboarding_completed: boolean
  user: {
    name: string
    watch_region?: string
  }
  api_keys: {
    tmdb?: string
    openai?: string
    anthropic?: string
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    default_recommendation_count: number
    quality_threshold: number
    include_adult: boolean
  }
  backup: {
    enabled: boolean
    frequency_days: number
    last_backup: string | null
  }
}

// Default configuration
const DEFAULT_CONFIG: CineAIConfig = {
  version: '1.0.0',
  setup_completed: false,
  taste_onboarding_completed: false,
  user: {
    name: 'User',
    watch_region: 'US',
  },
  api_keys: {},
  preferences: {
    theme: 'system',
    default_recommendation_count: 10,
    quality_threshold: 7.0,
    include_adult: false,
  },
  backup: {
    enabled: true,
    frequency_days: 7,
    last_backup: null,
  },
}

// Get data directory
function getDataDir(): string {
  return process.env.CINEAI_DATA_DIR || DEFAULT_DATA_DIR
}

// Get config file path
function getConfigPath(): string {
  return path.join(getDataDir(), CONFIG_FILENAME)
}

// Ensure data directory exists with proper permissions
function ensureDataDir(): void {
  const dataDir = getDataDir()
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  }
}

/**
 * ConfigService class
 */
class ConfigServiceClass {
  private config: CineAIConfig | null = null

  /**
   * Check if config file exists (first-run detection)
   */
  configExists(): boolean {
    return fs.existsSync(getConfigPath())
  }

  /**
   * Check if setup has been completed
   */
  isSetupCompleted(): boolean {
    if (!this.configExists()) return false
    const config = this.getConfig()
    return config.setup_completed
  }

  /**
   * Get the current configuration
   */
  getConfig(): CineAIConfig {
    if (this.config) {
      return this.config
    }

    const configPath = getConfigPath()

    if (!fs.existsSync(configPath)) {
      // Return default config if file doesn't exist
      return { ...DEFAULT_CONFIG }
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(content) as CineAIConfig

      // Merge with defaults to ensure all fields exist
      this.config = {
        ...DEFAULT_CONFIG,
        ...config,
        user: { ...DEFAULT_CONFIG.user, ...config.user },
        api_keys: { ...DEFAULT_CONFIG.api_keys, ...config.api_keys },
        preferences: { ...DEFAULT_CONFIG.preferences, ...config.preferences },
        backup: { ...DEFAULT_CONFIG.backup, ...config.backup },
      }

      return this.config
    } catch (error) {
      console.error('Failed to read config file:', error)
      return { ...DEFAULT_CONFIG }
    }
  }

  /**
   * Save the configuration
   */
  saveConfig(config: CineAIConfig): void {
    ensureDataDir()
    const configPath = getConfigPath()

    // Set secure file permissions (owner read/write only)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), {
      mode: 0o600,
    })

    this.config = config
  }

  /**
   * Update specific config values
   */
  updateConfig(updates: Partial<CineAIConfig>): CineAIConfig {
    const current = this.getConfig()

    const updated: CineAIConfig = {
      ...current,
      ...updates,
      user: { ...current.user, ...(updates.user || {}) },
      api_keys: { ...current.api_keys, ...(updates.api_keys || {}) },
      preferences: { ...current.preferences, ...(updates.preferences || {}) },
      backup: { ...current.backup, ...(updates.backup || {}) },
    }

    this.saveConfig(updated)
    return updated
  }

  /**
   * Initialize config with setup data
   */
  initializeConfig(setupData: {
    name: string
    tmdbKey?: string
    openaiKey?: string
    anthropicKey?: string
  }): CineAIConfig {
    const config: CineAIConfig = {
      ...DEFAULT_CONFIG,
      setup_completed: true,
      user: {
        name: setupData.name,
      },
      api_keys: {
        tmdb: setupData.tmdbKey,
        openai: setupData.openaiKey,
        anthropic: setupData.anthropicKey,
      },
    }

    this.saveConfig(config)
    return config
  }

  /**
   * Get API keys (with environment variable fallback)
   */
  getApiKeys(): {
    tmdb: string | undefined
    openai: string | undefined
    anthropic: string | undefined
  } {
    const config = this.getConfig()

    return {
      // Config file takes priority, then env vars
      tmdb: config.api_keys.tmdb || process.env.TMDB_API_KEY,
      openai: config.api_keys.openai || process.env.OPENAI_API_KEY,
      anthropic: config.api_keys.anthropic || process.env.ANTHROPIC_API_KEY,
    }
  }

  /**
   * Update API keys
   */
  updateApiKeys(keys: {
    tmdb?: string
    openai?: string
    anthropic?: string
  }): void {
    this.updateConfig({
      api_keys: keys,
    })
  }

  /**
   * Get user name
   */
  getUserName(): string {
    return this.getConfig().user.name
  }

  /**
   * Update user name
   */
  updateUserName(name: string): void {
    this.updateConfig({
      user: { name },
    })
  }

  /**
   * Get preferences
   */
  getPreferences(): CineAIConfig['preferences'] {
    return this.getConfig().preferences
  }

  /**
   * Update preferences
   */
  updatePreferences(prefs: Partial<CineAIConfig['preferences']>): void {
    const current = this.getConfig()
    this.updateConfig({
      preferences: {
        ...current.preferences,
        ...prefs,
      },
    })
  }

  /**
   * Record backup timestamp
   */
  recordBackup(): void {
    this.updateConfig({
      backup: {
        ...this.getConfig().backup,
        last_backup: new Date().toISOString(),
      },
    })
  }

  /**
   * Check if backup is due
   */
  isBackupDue(): boolean {
    const config = this.getConfig()
    if (!config.backup.enabled) return false
    if (!config.backup.last_backup) return true

    const lastBackup = new Date(config.backup.last_backup)
    const daysSince = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)

    return daysSince >= config.backup.frequency_days
  }

  /**
   * Get data directory path
   */
  getDataDirectory(): string {
    return getDataDir()
  }

  /**
   * Reset config (for testing)
   */
  reset(): void {
    this.config = null
  }

  /**
   * Check if AI features are available
   */
  hasAiKeys(): boolean {
    const keys = this.getApiKeys()
    return !!(keys.openai || keys.anthropic)
  }

  /**
   * Check if TMDB is configured
   */
  hasTmdbKey(): boolean {
    const keys = this.getApiKeys()
    return !!keys.tmdb
  }

  /**
   * Check if taste onboarding has been completed
   */
  isTasteOnboardingCompleted(): boolean {
    return this.getConfig().taste_onboarding_completed
  }

  /**
   * Mark taste onboarding as completed
   */
  completeTasteOnboarding(): void {
    this.updateConfig({
      taste_onboarding_completed: true,
    })
  }

  /**
   * Get watch region
   */
  getWatchRegion(): string {
    return this.getConfig().user.watch_region || 'US'
  }

  /**
   * Set watch region
   */
  setWatchRegion(region: string): void {
    this.updateConfig({
      user: { ...this.getConfig().user, watch_region: region },
    })
  }
}

// Export singleton instance
export const ConfigService = new ConfigServiceClass()

// Export for testing
export { ConfigServiceClass, DEFAULT_CONFIG }
