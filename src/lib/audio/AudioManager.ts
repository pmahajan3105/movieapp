export interface AudioPlaybackState {
  /** Indicates whether any audio is currently playing */
  isPlaying: boolean
  /** Identifier of the active audio source (e.g. URL, track id) */
  source: string | null
  /** Optional human-readable description */
  description?: string
}

/** Simple pub/sub based audio manager – **stub** implementation.
 *  This is **not** a fully-featured audio system, just enough to satisfy
 *  current UI components and TypeScript compiler. Replace with a real
 *  implementation later.
 */
class AudioManager {
  private state: AudioPlaybackState = { isPlaying: false, source: null }
  private listeners = new Set<(s: AudioPlaybackState) => void>()

  /** Subscribe to playback state changes. Returns an unsubscribe fn. */
  subscribe(listener: (state: AudioPlaybackState) => void): () => void {
    this.listeners.add(listener)
    // Emit current state immediately for convenience
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  /* -------- Helper methods below are placeholders -------- */

  /** Dummy implementation – returns currently active sources (max 1 in stub). */
  detectConcurrentAudio(): string[] {
    return this.state.source ? [this.state.source] : []
  }

  /** Update internal state & notify listeners. */
  private setState(partial: Partial<AudioPlaybackState>) {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach(l => l(this.state))
  }

  play(source: string, description?: string) {
    this.setState({ isPlaying: true, source, description })
  }

  pause() {
    this.setState({ isPlaying: false })
  }

  stopAllAudio() {
    this.setState({ isPlaying: false, source: null, description: undefined })
  }

  /** Alias used by the debugger component */
  emergencyStopAll() {
    this.stopAllAudio()
  }

  /** Text-to-speech placeholder – returns a resolved promise */
  async speak(text: string, category?: string): Promise<void> {
    console.debug('[AudioManager] speak()', { text: text.slice(0, 30), category })
    // Simulate playback duration
    this.play(`tts:${category || 'default'}`, text)
    await new Promise(r => setTimeout(r, 500))
    this.pause()
  }

  pauseCurrentAudio() {
    this.pause()
  }

  resumeCurrentAudio() {
    if (!this.state.isPlaying && this.state.source) {
      this.play(this.state.source, this.state.description)
    }
  }
}

export const audioManager = new AudioManager()
