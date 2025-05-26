'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/daisyui/Button'
import { Card, CardBody, CardTitle, CardActions } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function TestDaisyUIPage() {
  const { user, loading } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to access this test page.</p>
          <Link 
            href="/auth/login"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <Card className="w-full">
          <CardBody>
            <CardTitle>DaisyUI v5 Component Showcase</CardTitle>
            <p className="text-base-content/70">
              Testing converted components with pure DaisyUI v5 patterns
            </p>
          </CardBody>
        </Card>

        {/* Button Variants */}
        <Card>
          <CardBody>
            <CardTitle>Button Components</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="soft">Soft</Button>
              <Button variant="dash">Dash</Button>
              <Button variant="active">Active</Button>
            </div>
            
            <h4 className="font-semibold mb-3">Button Sizes</h4>
            <div className="flex flex-wrap gap-2 mb-6">
              <Button size="xs">XS</Button>
              <Button size="sm">SM</Button>
              <Button size="md">MD</Button>
              <Button size="lg">LG</Button>
              <Button size="xl">XL</Button>
            </div>

            <h4 className="font-semibold mb-3">Loading States</h4>
            <div className="flex flex-wrap gap-2">
              <Button loading>Loading</Button>
              <Button loading loadingType="dots" variant="primary">Dots</Button>
              <Button loading loadingType="ring" variant="secondary">Ring</Button>
              <Button loading loadingType="ball" variant="accent">Ball</Button>
            </div>
          </CardBody>
        </Card>

        {/* Input Components */}
        <Card>
          <CardBody>
            <CardTitle>Input Components</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Input placeholder="Default input" />
              <Input placeholder="Ghost input" variant="ghost" />
              <Input placeholder="Small input" size="sm" />
              <Input placeholder="Large input" size="lg" />
              <Input placeholder="Primary color" color="primary" />
              <Input placeholder="Success color" color="success" />
              <Input placeholder="Warning color" color="warning" />
              <Input placeholder="Error color" color="error" />
            </div>
          </CardBody>
        </Card>

        {/* Badge Components */}
        <Card>
          <CardBody>
            <CardTitle>Badge Components</CardTitle>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Colors</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge color="primary">Primary</Badge>
                  <Badge color="secondary">Secondary</Badge>
                  <Badge color="accent">Accent</Badge>
                  <Badge color="info">Info</Badge>
                  <Badge color="success">Success</Badge>
                  <Badge color="warning">Warning</Badge>
                  <Badge color="error">Error</Badge>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Variants</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" color="primary">Outline</Badge>
                  <Badge variant="soft" color="secondary">Soft</Badge>
                  <Badge variant="dash" color="accent">Dash</Badge>
                  <Badge variant="ghost" color="info">Ghost</Badge>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Sizes</h4>
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge size="xs">XS</Badge>
                  <Badge size="sm">SM</Badge>
                  <Badge size="md">MD</Badge>
                  <Badge size="lg">LG</Badge>
                  <Badge size="xl">XL</Badge>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Card Components */}
        <Card>
          <CardBody>
            <CardTitle>Card Variations</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card size="sm">
                <CardBody>
                  <CardTitle>Small Card</CardTitle>
                  <p>This is a small card example.</p>
                </CardBody>
              </Card>
              
              <Card size="md" variant="bordered">
                <CardBody>
                  <CardTitle>Bordered Card</CardTitle>
                  <p>This card has a border.</p>
                  <CardActions>
                    <Button size="sm">Action</Button>
                  </CardActions>
                </CardBody>
              </Card>
              
              <Card size="lg">
                <CardBody>
                  <CardTitle>Large Card</CardTitle>
                  <p>This is a large card with more space.</p>
                  <CardActions>
                    <Button variant="primary" size="sm">Primary</Button>
                    <Button variant="ghost" size="sm">Cancel</Button>
                  </CardActions>
                </CardBody>
              </Card>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
} 