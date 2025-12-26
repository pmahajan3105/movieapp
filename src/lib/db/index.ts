/**
 * Database Module Exports
 *
 * Central export point for all database-related functionality
 */

export { getDatabase, closeDatabase, databaseExists, getDataDirectory, getDatabasePath } from './sqlite-client'
export { LocalStorageService } from './local-storage-service'
export { SCHEMA_VERSION } from './schema'
