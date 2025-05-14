<script setup lang="ts">
import ExerciseForm from './components/ExerciseForm.vue'
import { ref, watch, onMounted, computed } from 'vue'
import {
  VCard,
  VCardText,
  VCardTitle,
  VCol,
  VBtn,
  VMenu,
  VList,
  VListItem
} from 'vuetify/components'
import { Container, Draggable } from 'vue3-smooth-dnd'
type PlayerState = 'idle' | 'playing' | 'paused' | 'reset'
interface Exercise {
  id: number
  exerciseName: string
  repetitions: number
  concentricSpeed: number
  eccentricSpeed: number
  firstPhase: string
  audioCues: string
  sets: number
  completedSets: number
  pause: number
  countdownBeforeStart: number
  gifUrl: string
  backgroundMelodyLink: string
  audioStart: boolean
  audioEnd: boolean
  audioEveryFifthRepetition: boolean
  announcePauseDuration: boolean
  announceNextExercise: boolean
  announceCountdown: boolean
  announcePauseEnd: boolean
  selectedForPlayer: boolean
}

const backgroundAudio = ref<HTMLAudioElement | null>(null)

const showForm = ref(false)
const exercises = ref<Exercise[]>([])
const isPause = ref(false)

const playerState = ref<PlayerState>('idle')
const editExercise = ref<Partial<Exercise>>({})
const groupExercises = ref<number[]>([])
const editMode = ref(false)
const exerciseInProgress = ref<Exercise | null>(null)

const countdown = ref(0)
const currentIndex = ref(0)
const countdownInterval = ref<ReturnType<typeof setInterval> | null>(null)
const utterance = new SpeechSynthesisUtterance()

const speak = (text: string, { rate = 1 } = { rate: 1 }): Promise<void> => {
  return new Promise((resolve) => {
    utterance.rate = rate
    utterance.text = text
    utterance.onend = () => resolve()
    speechSynthesis.speak(utterance)
  })
}

const setCurrentExercise = () => {
  console.log(
    '🚀 ~ setCurrentExercise ~ currentIndex.value:',
    currentIndex.value
  )
  if (currentIndex.value < selectedExercises.value.length) {
    exerciseInProgress.value = selectedExercises.value[currentIndex.value]
    currentIndex.value++
  } else {
    // Все упражнения пройдены
    exerciseInProgress.value = null
  }
}

const runExercise = async (exercise: Exercise, isPause: boolean) => {
  if (!exercise) return

  const exerciseName = exercise.exerciseName
  const repetitions = exercise.repetitions
  const pause = exercise.pause
  const countdownBeforeStart = exercise.countdownBeforeStart
  const audioStart = exercise.audioStart
  const audioEnd = exercise.audioEnd
  const audioEveryFifthRepetition = exercise.audioEveryFifthRepetition
  const announcePauseDuration = exercise.announcePauseDuration
  const announceNextExercise = exercise.announceNextExercise
  const announcePauseEnd = exercise.announcePauseEnd
  const eccentricSpeed = exercise.eccentricSpeed
  const concentricSpeed = exercise.concentricSpeed
  const firstPhase = exercise.firstPhase
  const audioCues = exercise.audioCues

  const movmentSpeed = concentricSpeed + eccentricSpeed

  const audio = playBackgroundAudio()

  try {
    if (audioStart) {
      await speak('Упражнение ' + exerciseName + ' начинается ')
    }

    if (countdownBeforeStart) {
      await speak('Три', { rate: 0.7 })
      await speak('Два', { rate: 0.7 })
      await speak('Один', { rate: 0.7 })
      await speak('Старт')
    }

    // Start exercise

    audio.play('melodies/melody_1.mp3')

    const repetition = startCountRepetition(movmentSpeed, repetitions)

    await repetition.counter(async (count: number) => {
      speak(`${count}`, { rate: 0.3 })
    })

    audio.stop()

    // End exercise

    // Start pause

    if (isPause) {
      if (audioEnd) {
        await speak('Конец упражнения')
      }

      const puseInsecond = pause / 1000

      if (announcePauseDuration) await speak(`Пауза ${puseInsecond} секунд`)

      audio.play('melodies/timer-tiking.mp3', { volume: 1 })

      await countdownPause(puseInsecond)

      audio.stop()

      if (announcePauseEnd) {
        await speak('Конец паузы')
      }
    }
  } catch (e) {
    console.log(e)
  }
}

const runExercises = async () => {
  // Найти все незавершённые упражнения
  const exercises = selectedExercises.value

  while (true) {
    // Найти упражнение с минимальным completedSets, которое ещё не завершено
    const pendingExercises = exercises.filter(
      (ex) => ex.completedSets < ex.sets
    )

    if (pendingExercises.length === 0) {
      // Все подходы завершены
      break
    }

    const nextExercise = pendingExercises.reduce((min, curr) =>
      curr.completedSets < min.completedSets ? curr : min
    )

    // Определить, будет ли пауза после упражнения (если оно не последнее завершённое)
    const isLastRemaining =
      pendingExercises.length === 1 &&
      nextExercise.completedSets + 1 === nextExercise.sets

    // Запуск логики упражнения
    await runExercise(nextExercise, !isLastRemaining)

    // Увеличить completedSets
    nextExercise.completedSets++

    // Обновить реактивный массив (Vue 3)
    const index = exercises.findIndex((ex) => ex.id === nextExercise.id)
    if (index !== -1) {
      selectedExercises.value[index] = { ...nextExercise }
    }
  }

  // Всё завершено
  await speak('Тренировка завершена')
}

const updateCompletedSets = (exerciseId: number, newValue: number) => {
  const index = selectedExercises.value.findIndex((e) => e.id === exerciseId)
  console.log('🚀 ~ updateCompletedSets ~ index:', index, exerciseId)
  if (index !== -1) {
    selectedExercises.value[index].completedSets = newValue
  }
}

const loadExercises = () => {
  const storedExercises = localStorage.getItem('exercises')
  exercises.value = storedExercises ? JSON.parse(storedExercises) : []
}

const toggleForm = () => {
  showForm.value = !showForm.value
}
const closeForm = () => {
  showForm.value = false
  editMode.value = false
  editExercise.value = {}
}

// const createCountdown = (duration: number) => {

// };

const startCountdown = (
  interval: number = 1000,
  callbackProcessing?: () => void
) => {
  return new Promise((resolve) => {
    countdownInterval.value = setInterval(() => {
      console.log(interval)
      if (countdown.value >= 0) {
        if (callbackProcessing) callbackProcessing()
        countdown.value -= 1
      } else {
        clearInterval(countdownInterval.value!)
        countdownInterval.value = null
        resolve(true)
      }
    }, interval)
  })
}

const countdownPause = (
  duration: number,
  callback?: (timeLeft: number) => void
): Promise<void> => {
  return new Promise((resolve) => {
    let timeLeft = duration

    const intervalId = setInterval(() => {
      if (callback) callback(timeLeft)
      timeLeft--

      if (timeLeft < 0) {
        clearInterval(intervalId)
        resolve()
      }
    }, 1000)
  })
}

const startCountRepetition = (interval: number = 1000, repetitions: number) => {
  let count = 0
  let countRepetitionInterval: ReturnType<typeof setInterval> | null = null

  return {
    counter: (callbackProcessing?: (count: number) => void) => {
      return new Promise((resolve) => {
        count++
        if (callbackProcessing) callbackProcessing(count)

        countRepetitionInterval = setInterval(() => {
          count++
          if (count <= repetitions) {
            if (callbackProcessing) callbackProcessing(count)
          } else {
            clearInterval(countRepetitionInterval!)
            countRepetitionInterval = null
            resolve(true)
          }
        }, interval)
      })
    }
  }
}

const pauseCountdown = () => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }
}

const resetCountdown = () => {
  pauseCountdown()
  countdown.value = 0
}

// const startSpeach = (text: string) => {
//   console.log('Начало выполнения startSpeach: ', text)

//   const selected = exercises.value.filter(
//     (exercise) => exercise.selectedForPlayer
//   )
//   if (selected.length === 0) {
//     return
//   }

//   utterance.text = text

//   speechSynthesis.speak(utterance)
// }

const formattedCountdown = computed(() =>
  formatTime(countdown.value || totalExercisesDuration.value)
)

const startPlayer = () => {
  playerState.value = 'playing'

  // exerciseInProgress.value = selectedExercises.value[currentIndex.value]
  runExercises()
}

const countinuePlayer = () => {
  playerState.value = 'playing'

  if (backgroundAudio.value) backgroundAudio.value.play()
  speechSynthesis.resume()
}

const pausePlayer = () => {
  playerState.value = 'paused'
  // Pause background audio
  if (backgroundAudio.value) {
    backgroundAudio.value.pause()
    speechSynthesis.pause()
  }
  pauseCountdown()
}

const resetPlayer = () => {
  playerState.value = 'idle'
  resetCountdown()
  // Stop background audio and clear vocalizations
  if (backgroundAudio.value) {
    backgroundAudio.value.load()
  }
  speechSynthesis.cancel()
  exerciseInProgress.value = null
  currentIndex.value = 0
}

const playBackgroundAudio = () => {
  return {
    play: (src: string, { volume = 0.3 } = {}) => {
      if (!backgroundAudio.value) return
      backgroundAudio.value.volume = volume
      backgroundAudio.value.src = src
      backgroundAudio.value.load()
      backgroundAudio.value.play()
    },
    stop: () => {
      if (!backgroundAudio.value) return
      backgroundAudio.value.pause()
    }
  }
}

const calculateTotalExerciseTime = (
  concentric: number,
  eccentric: number,
  repetitions: number
): string => {
  const totalMs = (concentric + eccentric) * repetitions
  const totalSeconds = Math.round(totalMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatMillisecondsToMinutesSeconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const onDrop = (dropResult: any) => {
  if (dropResult.removedIndex !== null && dropResult.addedIndex !== null) {
    exercises.value.splice(
      dropResult.addedIndex,
      0,
      exercises.value.splice(dropResult.removedIndex, 1)[0]
    )
  }
}

const handleEdit = (exercise: Exercise) => {
  editMode.value = showForm.value = true
  editExercise.value = exercise
}

const handleDelete = (exercise: Exercise) => {
  const storedExercises = localStorage.getItem('exercises')
  if (storedExercises) {
    const parsedExercises = JSON.parse(storedExercises) as Exercise[]
    const index = parsedExercises.findIndex(
      (item) => item.exerciseName === exercise.exerciseName
    )
    if (index > -1) {
      parsedExercises.splice(index, 1)
      localStorage.setItem('exercises', JSON.stringify(parsedExercises))
      exercises.value = parsedExercises.map((exercise: Exercise) => ({
        ...exercise,
        selectedForPlayer: true
      }))
    }
  }
}

// Computed properties for footer info
const selectedExercises = computed(() => {
  return exercises.value.filter((exercise) => exercise.selectedForPlayer)
})

const totalSelectedExercises = computed(() => {
  return selectedExercises.value.length
})

const formatTime = (totalSeconds: number): string => {
  if (totalSeconds < 60) {
    return `${totalSeconds}`
  } else {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
}

const totalExercisesDuration = computed(() => {
  let totalTime = 0
  selectedExercises.value.forEach((ex: Exercise) => {
    const sets = ex?.sets || 0
    const repetitions = ex?.repetitions || 0
    const concentric = ex?.concentricSpeed || 0
    const eccentric = ex?.eccentricSpeed || 0
    const pause = ex?.pause || 0

    const exercise = (concentric + eccentric) * repetitions * sets
    const totalPause = pause * sets
    const exerciseTime = exercise + totalPause

    totalTime += exerciseTime
  })
  return totalTime / 1000
})

const isStartButtonDisabled = computed(() => {
  return !exercises.value.some((exercise) => exercise.selectedForPlayer)
})

const isPlayerStarted = computed(() => {
  return playerState.value === 'playing'
})

const isPlayerPaused = computed(() => {
  return playerState.value === 'paused'
})

onMounted(() => {
  const storedExercises = localStorage.getItem('exercises')
  if (storedExercises) {
    exercises.value = JSON.parse(storedExercises).map((exercise: Exercise) => ({
      ...exercise,
      selectedForPlayer: true // Always initialize selectedForPlayer to true
    }))
  } else {
    exercises.value = []
    groupExercises.value = []
  }
})

// watch(exerciseInProgress, async (exercise: Exercise | null) => {
//   if (!exercise) return

//   const exerciseId = exercise.id
//   const exerciseName = exercise.exerciseName
//   console.log('🚀 ~ watch ~ exerciseName:', exerciseName, exerciseId)
//   const repetitions = exercise.repetitions
//   const sets = exercise.sets
//   const completedSets = exercise.completedSets + 1
//   const pause = exercise.pause
//   const countdownBeforeStart = exercise.countdownBeforeStart
//   const audioStart = exercise.audioStart
//   const audioEnd = exercise.audioEnd
//   const audioEveryFifthRepetition = exercise.audioEveryFifthRepetition
//   const announcePauseDuration = exercise.announcePauseDuration
//   const announceNextExercise = exercise.announceNextExercise
//   const announcePauseEnd = exercise.announcePauseEnd
//   const eccentricSpeed = exercise.eccentricSpeed
//   const concentricSpeed = exercise.concentricSpeed
//   const firstPhase = exercise.firstPhase
//   const audioCues = exercise.audioCues

//   const duration = (concentricSpeed + eccentricSpeed) * repetitions
//   const movmentSpeed = concentricSpeed + eccentricSpeed
//   console.log('movmentSpeed,', movmentSpeed)

//   async function handleBody() {
//     const audio = playBackgroundAudio()

//     if (audioStart) {
//       await speak('Упражнение ' + exerciseName + ' начинается ')
//     }

//     if (countdownBeforeStart) {
//       await speak('Три', { rate: 0.7 })
//       await speak('Два', { rate: 0.7 })
//       await speak('Один', { rate: 0.7 })
//       await speak('Старт')
//     }

//     // Start exercise

//     audio.play('melodies/melody_1.mp3')

//     const repetition = startCountRepetition(movmentSpeed, repetitions)

//     await repetition.counter(async (count: number) => {
//       speak(`${count}`, { rate: 0.3 })
//     })

//     audio.stop()

//     // End exercise

//     // Start pause

//     if (
//       completedSets <= sets &&
//       currentIndex.value < selectedExercises.value.length
//     ) {
//       if (audioEnd) {
//         await speak('Конец упражнения')
//       }

//       isPause.value = true

//       const puseInsecond = pause / 1000

//       if (announcePauseDuration) await speak(`Пауза ${puseInsecond} секунд`)

//       audio.play('melodies/timer-tiking.mp3', { volume: 1 })

//       await countdownPause(puseInsecond)

//       audio.stop()

//       if (announcePauseEnd) {
//         await speak('Конец паузы')
//       }

//       isPause.value = false
//     }

//     // End pause

//     // Next set

//     if (currentIndex.value === selectedExercises.value.length) {
//       // Check if the pause is for last exercise in set

//       await speak('Конец текущего сета')

//       const index = selectedExercises.value.findIndex(
//         (item) => item.sets > completedSets
//       )

//       // Mark the current exercise as completed

//       if (index != -1) {
//         currentIndex.value = index
//         setCurrentExercise()
//         handleBody()
//       } else {
//         resetPlayer()
//       }
//     } else {
//       updateCompletedSets(exerciseId, completedSets)
//       setCurrentExercise()
//     }
//   }

//   try {
//     handleBody()
//   } catch (e) {
//     console.log(e)
//   }
// })
</script>

<template>
  <v-app>
    <v-main>
      <v-container fluid class="pa-0">
        <v-btn color="indigo" @click="toggleForm" class="my-6" size="large">
          {{ showForm ? 'Скрыть форму' : 'Добавить упражнение' }}
        </v-btn>
        <ExerciseForm
          v-model="showForm"
          @close="closeForm"
          :editMode="editMode"
          :editExercise="editExercise"
          @save="loadExercises"
        />
        <Container
          fluid
          v-if="exercises.length > 0"
          orientation="vertical"
          @drop="onDrop"
          drag-handle-selector=".drag-handle"
        >
          <v-row no-gutters>
            <Draggable
              class="w-100"
              v-for="(exercise, index) in exercises"
              :key="index"
            >
              <v-col cols="12" class="drag-handle pt-0">
                <v-card variant="tonal" color="indigo">
                  <v-card-title class="d-flex align-center">
                    <v-checkbox
                      v-model="exercise.selectedForPlayer"
                      hide-details
                      density="compact"
                    ></v-checkbox>
                    <span class="ml-2">{{ exercise.exerciseName }}</span>
                    <v-spacer></v-spacer>
                    <v-menu>
                      <template v-slot:activator="{ props }">
                        <v-btn
                          icon
                          density="compact"
                          variant="plain"
                          v-bind="props"
                        >
                          <v-icon>mdi-dots-vertical</v-icon>
                        </v-btn>
                      </template>
                      <v-list>
                        <v-list-item @click="handleEdit(exercise)"
                          >Редактировать</v-list-item
                        >

                        <v-list-item @click="handleDelete(exercise)"
                          >Удалить</v-list-item
                        >
                      </v-list>
                    </v-menu>
                  </v-card-title>

                  <v-divider></v-divider>

                  <v-card-text>
                    <v-expansion-panels elevation="0">
                      <v-expansion-panel title="Детали" bg-color="#edeefa">
                        <v-expansion-panel-text>
                          <p class="w-100 d-flex justify-space-between">
                            <span>Повторений:</span
                            ><span>{{ exercise.repetitions }}</span>
                          </p>
                          <p class="w-100 d-flex justify-space-between">
                            <span>Подходы:</span
                            ><span>{{ exercise.sets }}</span>
                          </p>
                          <p class="w-100 d-flex justify-space-between">
                            <span>Продолжительность подхода:</span
                            ><span
                              >{{
                                calculateTotalExerciseTime(
                                  exercise.concentricSpeed,
                                  exercise.eccentricSpeed,
                                  exercise.repetitions
                                )
                              }}
                            </span>
                          </p>
                          <p class="w-100 d-flex justify-space-between">
                            <span>Пауза:</span
                            ><span
                              >{{
                                formatMillisecondsToMinutesSeconds(
                                  exercise.pause
                                )
                              }}
                            </span>
                          </p>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card-text>
                </v-card>
              </v-col>
            </Draggable>
          </v-row>
        </Container>
      </v-container>
    </v-main>
    <audio ref="backgroundAudio" loop></audio>

    <v-footer
      app
      fixed
      class="d-flex flex-column"
      elevation="3"
      style="border-radius: 16px 16px 0 0"
      :class="[
        { 'bg-success text-white': isPlayerStarted },
        { 'bg-warning text-white': playerState === 'paused' }
      ]"
    >
      <div class="pb-1 w-100">
        <div v-show="isPlayerStarted || isPlayerPaused" class="pb-2">
          <p
            class="text-h5 mb-2 d-flex justify-space-between align-center gap-2"
          >
            <span>{{
              isPause && exerciseInProgress
                ? 'Пауза'
                : exerciseInProgress?.exerciseName
            }}</span>
            <v-progress-circular
              :model-value="formattedCountdown"
              :rotate="360"
              :size="40"
              :width="5"
              color="white"
            ></v-progress-circular>
          </p>

          <v-divider></v-divider>
        </div>
        <div v-if="playerState === 'idle' || playerState === 'reset'">
          <v-btn
            icon
            large
            color="indigo"
            variant="plain"
            density="comfortable"
            class="mx-2"
            @click="startPlayer"
            :disabled="isStartButtonDisabled"
          >
            <v-icon>mdi-play</v-icon>
          </v-btn>
        </div>
        <div v-if="isPlayerStarted">
          <v-btn
            icon
            large
            variant="plain"
            density="comfortable"
            class="mx-2"
            @click="pausePlayer"
          >
            <v-icon>mdi-pause</v-icon>
          </v-btn>
          <v-btn
            icon
            large
            variant="plain"
            density="comfortable"
            class="mx-2"
            @click="resetPlayer"
          >
            <v-icon>mdi-stop</v-icon>
          </v-btn>
        </div>
        <div v-if="isPlayerPaused">
          <v-btn
            icon
            large
            variant="plain"
            density="comfortable"
            class="mx-2"
            @click="countinuePlayer"
          >
            <v-icon>mdi-play</v-icon>
          </v-btn>
          <v-btn
            icon
            large
            variant="plain"
            density="comfortable"
            class="mx-2"
            @click="resetPlayer"
          >
            <v-icon>mdi-stop</v-icon>
          </v-btn>
        </div>
      </div>
      <div class="w-100"><v-divider></v-divider></div>
      <div class="pt-2 text-caption w-100 d-flex justify-space-between">
        <p v-if="!isPlayerStarted && !isPlayerPaused">
          Выбрано упражнений: {{ totalSelectedExercises }}
        </p>
        <p v-else>Оставшееся время: {{ formattedCountdown }}</p>
        <v-divider vertical class="mx-1"></v-divider>
        <p>Общее время: {{ formatTime(totalExercisesDuration) }}</p>
      </div>
    </v-footer>
  </v-app>
</template>
