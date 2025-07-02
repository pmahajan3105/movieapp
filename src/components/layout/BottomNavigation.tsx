'use client'

import React from 'react'

export const BottomNavigation: React.FC = () => {
  // Bottom navigation disabled - using top navigation only
  return null
}

// Hook to manage bottom navigation state
export const useBottomNavigation = () => {
  // Bottom navigation disabled
  return {
    shouldShow: false,
    currentPath: ''
  }
}