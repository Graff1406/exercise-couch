import { ref, watch, computed, type Ref } from 'vue'

export type PlayerState = 'idle' | 'running' | 'paused' | 'reset'

export function useAudioPlayer(status: Ref<PlayerState>) {
  const audio = ref<HTMLAudioElement | null>(null)
  const source = ref<string>('')

  function loadAudioPlayer(src: string) {
    if (audio.value) {
      audio.value.pause()
      audio.value = null
    }
    audio.value = new Audio(src)
    audio.value.volume = 0.3
    audio.value.loop = true
    source.value = src

    audio.value.play().catch((err) => {
      console.warn('Autoplay prevented:', err)
    })

    audio.value.onended = () => {
      status.value = 'idle'
    }
  }

  watch(status, async (newStatus) => {
    if (!audio.value) return

    switch (newStatus) {
      case 'running':
        try {
          await audio.value.play()
        } catch (err) {
          console.error('Ошибка воспроизведения:', err)
        }
        break
      case 'paused':
        audio.value.pause()
        break
      case 'reset':
        audio.value.pause()
        audio.value.currentTime = 0
        status.value = 'idle'
        break
      case 'idle':
        audio.value.pause()
        break
    }
  })

  function pauseAudioPlayer() {
    if (audio.value) {
      audio.value.pause()
    }
  }

  function stopAudioPlayer() {
    if (audio.value) {
      audio.value.pause()
      audio.value.currentTime = 0
    }
  }

  return {
    loadAudioPlayer,
    status,
    pauseAudioPlayer,
    stopAudioPlayer,
    isPlaying: computed(() => status.value === 'running'),
    source
  }
}
