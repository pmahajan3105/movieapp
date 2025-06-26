import '@testing-library/jest-dom'
import { randomUUID } from 'crypto'
import 'whatwg-fetch'
import './src/__tests__/setupMocks'

// Polyfill for crypto.randomUUID
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    ...global.crypto,
    randomUUID,
  }
} else if (typeof global.crypto.randomUUID === 'undefined') {
  global.crypto.randomUUID = randomUUID
}
