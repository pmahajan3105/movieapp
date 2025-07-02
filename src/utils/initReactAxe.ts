/* istanbul ignore file */
/* eslint-disable */
// Initialize axe-core accessibility testing in development mode

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  // @ts-expect-error optional dev dependency
  import('@axe-core/react').then(({ default: axe }) => {
    // Dynamically import React to avoid breaking SSR
     
    // @ts-ignore dynamic require only in dev
    const React = require('react')
     
    // @ts-ignore dynamic require only in dev
    const ReactDOM = require('react-dom')
    axe(React, ReactDOM, 1000)
  })
} 