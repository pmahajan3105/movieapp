// Simple test script to check preferences API
// Run with: node test-preferences.js

const testPreferences = async () => {
  console.log('🧪 Testing Preferences API...')

  try {
    // Test getting preferences (should require auth)
    const response = await fetch('http://localhost:3000/api/preferences', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log('📋 Preferences API Response:', {
      status: response.status,
      success: data.success,
      hasPreferences: !!data.preferences,
      preferences: data.preferences,
    })

    if (response.status === 401) {
      console.log('✅ Authentication required (expected for logged-out test)')
    } else if (response.status === 200) {
      console.log('✅ API working, preferences:', data.preferences)
    } else {
      console.log('❌ Unexpected response:', data)
    }
  } catch (error) {
    console.error('❌ Test error:', error.message)
  }
}

// Run the test
testPreferences()
