import { motion, AnimatePresence } from 'framer-motion'
import { useIsFetching } from '@tanstack/react-query'

/**
 * Global full-screen loading overlay
 * Shows whenever React-Query has active fetches.
 * Fade-in after 150 ms to avoid flicker on ultra-fast requests.
 */
export default function LoadingOverlay() {
  const isFetching = useIsFetching()
  const visible = isFetching > 0

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[1200] flex flex-col items-center justify-center bg-base-100/60 backdrop-blur-sm"
        >
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="mt-4 text-sm font-medium text-base-content/80">Loading…</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 