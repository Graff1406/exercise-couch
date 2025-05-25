import { computed } from 'vue'

export function usePauseDurationOptions() {
  const pauseDurationOptions = computed(() => {
    const options = []
    for (let i = 0; i <= 300; i += 5) {
      const value = i * 1000 // in milliseconds
      const minutes = Math.floor(i / 60)
      const seconds = i % 60
      const label = `${minutes}:${seconds.toString().padStart(2, '0')}`
      options.push({ value, label })
    }
    return options
  })

  return { pauseDurationOptions }
}
