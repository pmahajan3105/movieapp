/**
 * SQLite Client for CineAI Personal Mode
 *
 * Manages the local SQLite database connection and initialization
 */

import Database from 'better-sqlite3'
import path from 'path'
import os from 'os'
import fs from 'fs'
import {
  CREATE_TABLES_SQL,
  CREATE_INDEXES_SQL,
  INSERT_DEFAULT_USER_SQL,
  INSERT_SCHEMA_VERSION_SQL,
  SCHEMA_VERSION,
} from './schema'

// Default data directory
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.cineai')
const DB_FILENAME = 'cineai.db'

// Get data directory from environment or use default
function getDataDir(): string {
  return process.env.CINEAI_DATA_DIR || DEFAULT_DATA_DIR
}

// Get database path
function getDbPath(): string {
  return path.join(getDataDir(), DB_FILENAME)
}

// Ensure data directory exists
function ensureDataDir(): void {
  const dataDir = getDataDir()
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
    console.log(`Created CineAI data directory: ${dataDir}`)
  }
}

// Check if database exists
export function databaseExists(): boolean {
  return fs.existsSync(getDbPath())
}

// Database singleton
let db: Database.Database | null = null

/**
 * Get or create the SQLite database connection
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db
  }

  ensureDataDir()
  const dbPath = getDbPath()
  const isNewDb = !fs.existsSync(dbPath)

  db = new Database(dbPath)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL')

  if (isNewDb) {
    initializeDatabase(db)
    console.log(`Created new CineAI database at: ${dbPath}`)
  } else {
    // Check and run migrations if needed
    checkAndMigrate(db)
  }

  return db
}

/**
 * Initialize a new database with schema
 */
function initializeDatabase(database: Database.Database): void {
  // Create tables
  database.exec(CREATE_TABLES_SQL)

  // Create indexes
  database.exec(CREATE_INDEXES_SQL)

  // Insert default user
  database.exec(INSERT_DEFAULT_USER_SQL)

  // Record schema version
  const insertVersion = database.prepare(INSERT_SCHEMA_VERSION_SQL)
  insertVersion.run(SCHEMA_VERSION)
}

/**
 * Check schema version and run migrations if needed
 */
function checkAndMigrate(database: Database.Database): void {
  try {
    const row = database
      .prepare('SELECT MAX(version) as version FROM schema_version')
      .get() as { version: number } | undefined

    const currentVersion = row?.version || 0

    if (currentVersion < SCHEMA_VERSION) {
      console.log(`Migrating database from v${currentVersion} to v${SCHEMA_VERSION}`)
      runMigrations(database, currentVersion)
    }
  } catch {
    // schema_version table might not exist in very old databases
    console.log('Initializing schema version tracking...')
    database.exec(CREATE_TABLES_SQL)
    database.exec(CREATE_INDEXES_SQL)
    const insertVersion = database.prepare(INSERT_SCHEMA_VERSION_SQL)
    insertVersion.run(SCHEMA_VERSION)
  }
}

/**
 * Run migrations from a specific version
 */
function runMigrations(database: Database.Database, fromVersion: number): void {
  // Add migration logic here as schema evolves
  // Example:
  // if (fromVersion < 2) {
  //   database.exec('ALTER TABLE movies ADD COLUMN new_field TEXT')
  // }

  // Update version
  const insertVersion = database.prepare(INSERT_SCHEMA_VERSION_SQL)
  insertVersion.run(SCHEMA_VERSION)
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Get data directory path (for config file location)
 */
export function getDataDirectory(): string {
  return getDataDir()
}

/**
 * Get database file path
 */
export function getDatabasePath(): string {
  return getDbPath()
}

// Export types for convenience
export type { Database } from 'better-sqlite3'
