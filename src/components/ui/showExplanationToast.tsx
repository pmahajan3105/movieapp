import React from 'react'
import { createRoot } from 'react-dom/client'
import { ExplanationPopover } from '@/components/movies/ExplanationPopover'
import { RecommendationExplanation } from '@/types/explanation'

const TOAST_ROOT_ID = 'global-toast-root'

function ensureRoot(): HTMLElement {
  let root = document.getElementById(TOAST_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = TOAST_ROOT_ID
    root.className = 'toast toast-end toast-top fixed right-4 top-4 z-[1000]'
    document.body.appendChild(root)
  }
  return root
}

export function showExplanationToast(explanation: RecommendationExplanation) {
  if (typeof window === 'undefined') return
  const root = ensureRoot()

  const wrapper = document.createElement('div')
  root.appendChild(wrapper)

  let reactRoot: ReturnType<typeof createRoot> | null = null

  const handleRemove = () => {
    reactRoot?.unmount()
    root.removeChild(wrapper)
  }

  const Toast: React.FC = () => (
    <div className="alert alert-info shadow-lg animate-fade-in" onClick={handleRemove}>
      <ExplanationPopover explanation={explanation} />
    </div>
  )

  reactRoot = createRoot(wrapper)
  reactRoot.render(<Toast />)

  // auto-dismiss after 7s
  setTimeout(handleRemove, 7000)
} 