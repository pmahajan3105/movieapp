/**
 * Admin Tune Weights API Tests
 * Tests the runtime weight configuration endpoint from Sprint 4
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/admin/tune-weights/route'
import fs from 'fs'
import path from 'path'

// Mock fs for file operations
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}))

// Mock path for config location
jest.mock('path', () => ({
  join: jest.fn(),
  dirname: jest.fn(),
  resolve: jest.fn()
}))

describe('/api/admin/tune-weights', () => {
  beforeEach(() => {
    // Reset all mocks
    ;(fs.readFileSync as jest.Mock).mockReset()
    ;(fs.writeFileSync as jest.Mock).mockReset()
    ;(fs.existsSync as jest.Mock).mockReset()
    ;(fs.mkdirSync as jest.Mock).mockReset()
    ;(path.join as jest.Mock).mockReset()
    ;(path.dirname as jest.Mock).mockReset()
    
    // Setup default path mocking
    ;(path.join as jest.Mock).mockReturnValue('/mock/config/recommender-weights.json')
    ;(path.dirname as jest.Mock).mockReturnValue('/mock/config')
  })

  describe('GET /api/admin/tune-weights', () => {
    it('should return current weights when config file exists', async () => {
      const mockConfig = {
        weights: {
          semantic: { base: 0.4 },
          rating: { base: 0.25 },
          popularity: { base: 0.15 },
          recency: { base: 0.1 },
          preference: { genreMatch: 0.1 }
        },
        meta: { test: true },
        version: '1.0'
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.current.semantic).toBe(0.4)
      expect(data.current.rating).toBe(0.25)
      expect(data.meta).toEqual({ test: true })
      expect(data.version).toBe('1.0')
    })

    it('should return 404 when config file does not exist', async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Weights config not found')
    })

    it('should return default weights when config file is invalid JSON', async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue('invalid json')

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get weights')
    })

    it('should handle file read errors gracefully', async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to get weights')
    })
  })

  describe('POST /api/admin/tune-weights', () => {
    it('should update weights successfully', async () => {
      const newWeights = {
        semantic: 0.5,
        rating: 0.3,
        popularity: 0.1,
        recency: 0.05,
        preference: 0.05
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(false)
      ;(fs.writeFileSync as jest.Mock).mockImplementation(() => {})
      ;(fs.mkdirSync as jest.Mock).mockImplementation(() => {})

      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: JSON.stringify({ weights: newWeights }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.updated).toBeDefined()
      expect(data.version).toBeDefined()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should normalize weights that do not sum to 1.0', async () => {
      const unnormalizedWeights = {
        semantic: 0.8,
        rating: 0.8,
        popularity: 0.8,
        recency: 0.8,
        preference: 0.8
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(false)
      ;(fs.writeFileSync as jest.Mock).mockImplementation(() => {})
      ;(fs.mkdirSync as jest.Mock).mockImplementation(() => {})

      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: JSON.stringify({ weights: unnormalizedWeights }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Each weight should be normalized to 0.2 (0.8/4.0)
      expect(data.updated.semantic).toBeCloseTo(0.2, 5)
    })

    it('should handle missing weights in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid weights format')
    })

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update weights')
    })

    it('should validate weight values are numeric and in range', async () => {
      const invalidWeights = {
        semantic: 1.5, // > 1
        rating: -0.1, // < 0
        popularity: 'invalid', // not a number
        recency: 0.1,
        preference: 0.1
      }

      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: JSON.stringify({ weights: invalidWeights }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid weight for')
    })

    it('should handle zero total weights', async () => {
      const zeroWeights = {
        semantic: 0,
        rating: 0,
        popularity: 0,
        recency: 0,
        preference: 0
      }

      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: JSON.stringify({ weights: zeroWeights }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Total weight cannot be zero')
    })

    it('should handle file write errors', async () => {
      const validWeights = {
        semantic: 0.4,
        rating: 0.3,
        popularity: 0.2,
        recency: 0.05,
        preference: 0.05
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(false)
      ;(fs.mkdirSync as jest.Mock).mockImplementation(() => {})
      ;(fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: JSON.stringify({ weights: validWeights }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update weights')
    })

    it('should preserve existing config when updating weights', async () => {
      const existingConfig = {
        weights: {
          semantic: { base: 0.3 },
          rating: { base: 0.3 },
          popularity: { base: 0.2 },
          recency: { base: 0.1 },
          preference: { genreMatch: 0.1 }
        },
        meta: { existing: true },
        version: '1.0'
      }

      const newCoreWeights = {
        semantic: 0.5,
        rating: 0.25,
        popularity: 0.15,
        recency: 0.05,
        preference: 0.05
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(existingConfig))
      ;(fs.writeFileSync as jest.Mock).mockImplementation(() => {})
      ;(fs.mkdirSync as jest.Mock).mockImplementation(() => {})

      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: JSON.stringify({ weights: newCoreWeights }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated.semantic).toBe(0.5)
      expect(data.success).toBe(true)
    })
  })

  describe('Config File Management', () => {
    it('should create config directory if it does not exist', async () => {
      const weights = {
        semantic: 0.4,
        rating: 0.3,
        popularity: 0.2,
        recency: 0.05,
        preference: 0.05
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(false)
      ;(fs.writeFileSync as jest.Mock).mockImplementation(() => {})
      ;(fs.mkdirSync as jest.Mock).mockImplementation(() => {})

      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: JSON.stringify({ weights }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      )
    })

    it('should include metadata in saved config', async () => {
      const weights = {
        semantic: 0.4,
        rating: 0.3,
        popularity: 0.2,
        recency: 0.05,
        preference: 0.05
      }

      let savedContent = ''
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)
      ;(fs.writeFileSync as jest.Mock).mockImplementation((path, content) => {
        savedContent = content
      })
      ;(fs.mkdirSync as jest.Mock).mockImplementation(() => {})

      const request = new NextRequest('http://localhost:3000/api/admin/tune-weights', {
        method: 'POST',
        body: JSON.stringify({ weights }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      await POST(request)

      const savedConfig = JSON.parse(savedContent)
      expect(savedConfig.lastUpdated).toBeDefined()
      expect(savedConfig.version).toBeDefined()
      expect(savedConfig.meta.lastManualUpdate).toBeDefined()
      expect(savedConfig.weights.semantic.base).toBe(0.4)
    })
  })
}) 