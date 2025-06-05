import { TextToSpeech } from '@capacitor-community/text-to-speech'

import { type Ref, watchEffect, watch } from 'vue'
import type { PlayerState } from '../types/PlayerState'

export function usePauseDurationOptions(status: Ref<PlayerState>) {
  const waitWhilePaused = (): Promise<void> => {
    return new Promise((resolve) => {
      if (status.value !== 'paused') {
        resolve()
        return
      }

      const stopWatch = watchEffect(() => {
        if (status.value !== 'paused') {
          stopWatch()
          resolve()
        }
      })
    })
  }

  const speak = async (text: string, { rate = 1 } = {}): Promise<void> => {
    if (status.value === 'reset' || status.value === 'idle') return

    await waitWhilePaused()

    try {
      await TextToSpeech.speak({
        text,
        lang: 'ru-RU',
        rate: Math.min(Math.max(rate, 0.1), 1.0),
        pitch: 1.0,
        volume: 1.0
      })
    } catch (error) {
      console.error('TextToSpeech error:', error)
    }
  }

  const beep = async (
    duration = 200,
    frequency = 440,
    volume = 1
  ): Promise<void> => {
    if (status.value === 'reset' || status.value === 'idle') return

    await waitWhilePaused()

    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.connect(gain)
    gain.connect(context.destination)

    oscillator.frequency.value = frequency
    gain.gain.value = volume

    oscillator.start()
    oscillator.stop(context.currentTime + duration / 1000)
  }

  const countdownExerciseOrPause = async (
    duration: number,
    target: Ref<number>
  ): Promise<void> => {
    const start = Date.now()
    let remaining = duration
    let timerId: number | null = null
    let resolve: () => void

    const done = new Promise<void>((res) => (resolve = res))

    const tick = () => {
      const now = Date.now()
      remaining = Math.max(0, duration - (now - start))
      target.value = Math.ceil(remaining / 1000)

      if (remaining <= 0) {
        clearInterval(timerId!)
        resolve()
      }
    }

    const startTimer = () => {
      if (timerId) return
      timerId = setInterval(() => {
        if (status.value === 'paused') return
        if (status.value === 'reset' || status.value === 'idle') {
          clearInterval(timerId!)
          timerId = null
          target.value = 0
          resolve()
          return
        }
        tick()
      }, 100)
    }

    startTimer()

    const stopWatch = watch(
      status,
      (val) => {
        if (val === 'reset' || status.value === 'idle') {
          clearInterval(timerId!)
          timerId = null
          target.value = 0
          stopWatch()
          resolve()
        }
      },
      { immediate: false }
    )

    await done
    stopWatch()
  }

  const startCountRepetition = (interval = 1000, repetitions: number) => {
    let count = 0
    let isStopped = false

    const counter = async (callbackProcessing?: (count: number) => void) => {
      while (count < repetitions) {
        if (isStopped) break

        await waitWhilePaused()
        if (isStopped) break

        count++
        if (callbackProcessing) callbackProcessing(count)

        for (let elapsed = 0; elapsed < interval; elapsed += 100) {
          if (isStopped) break
          await new Promise((r) => setTimeout(r, 100))
          await waitWhilePaused()
          if (isStopped) break
        }
      }
    }

    return {
      counter,
      stop: () => {
        isStopped = true
      }
    }
  }

  return {
    beep,
    speak,
    countdownExerciseOrPause,
    startCountRepetition,
    waitWhilePaused
  }
}
