export default function BasicTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Basic Test Page
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Tailwind CSS Test
          </h2>
          <p className="text-gray-600 mb-4">
            This page tests basic Tailwind CSS functionality without DaisyUI.
          </p>
          
          <div className="flex gap-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
              Primary Button
            </button>
            <button className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors">
              Secondary Button
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-2">Card 1</h3>
            <p className="text-gray-600">This is a test card with some content.</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-2">Card 2</h3>
            <p className="text-gray-600">This is another test card with content.</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-2">Card 3</h3>
            <p className="text-gray-600">This is the third test card.</p>
          </div>
        </div>
      </div>
    </div>
  )
} 