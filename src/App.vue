<script setup lang="ts">
import ExerciseForm from './components/ExerciseForm.vue'
import SharedFooterContent from './components/SharedFooterContent.vue'
import { ref, onMounted, computed, watch } from 'vue'
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
  repetitionDuration: number
  sets: number
  completedSets: number
  pause: number
  countdownBeforeStart: number
  gifUrl: string
  backgroundMelodyLink: string
  audioStart: boolean
  audioEnd: boolean
  announcePauseDuration: boolean
  announceCountdown: boolean
  announcePauseEnd: boolean
  selectedForPlayer: boolean
}

const backgroundAudio = ref<HTMLAudioElement | null>(null)

const showForm = ref(false)
const exercises = ref<Exercise[]>([])
const isInProgressPause = ref(false)
const isInProgressExercise = ref(false)
const isTrainingStarted = ref(false)

const playerState = ref<PlayerState>('idle')
const editExercise = ref<Partial<Exercise>>({})
const groupExercises = ref<number[]>([])
const editMode = ref(false)
const exerciseInProgress = ref<Exercise | null>(null)

const countdown = ref(0)
const currentIndex = ref(0)
const countdownInterval = ref<ReturnType<typeof setInterval> | null>(null)
const utterance = new SpeechSynthesisUtterance()

const loadExercises = () => {
  const storedExercises = localStorage.getItem('exercises')
  exercises.value = storedExercises ? JSON.parse(storedExercises) : []
}

const speak = (text: string, { rate = 1 } = { rate: 1 }): Promise<void> => {
  return new Promise((resolve) => {
    utterance.rate = rate
    utterance.text = text
    utterance.onend = () => resolve()
    speechSynthesis.speak(utterance)
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

const pauseCountRepetition = (
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
  time: number,
  callbackProcessing?: (countdown: number) => void
) => {
  let countdown = time / 1000

  return new Promise((resolve) => {
    if (callbackProcessing) callbackProcessing(countdown) // вызов сразу

    countdownInterval.value = setInterval(() => {
      countdown -= 1
      if (countdown >= 0) {
        if (callbackProcessing) callbackProcessing(countdown)
      } else {
        clearInterval(countdownInterval.value!)
        countdownInterval.value = null
        resolve(true)
      }
    }, 1000)
  })
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

const startPlayer = () => {
  playerState.value = 'playing'
  isTrainingStarted.value = true
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
  // Stop background audio and clear vocalizations
  if (backgroundAudio.value) {
    backgroundAudio.value.load()
  }
  speechSynthesis.cancel()
  exerciseInProgress.value = null
  currentIndex.value = 0
  isInProgressPause.value = false
  isInProgressExercise.value = false
  isTrainingStarted.value = false
  resetCountdown()
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

const formatTime = (totalTime: number): string => {
  const totalSeconds = Math.floor(totalTime / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Computed properties for footer info
const selectedExercises = computed(() => {
  return exercises.value.filter((exercise) => exercise.selectedForPlayer)
})

const totalSelectedExercises = computed(() => {
  return selectedExercises.value.length
})

const totalExercisesDuration = computed(() => {
  let totalTime = 0
  selectedExercises.value.forEach((ex: Exercise) => {
    const sets = ex?.sets || 0
    const repetitions = ex?.repetitions || 0
    const repetitionDuration = ex?.repetitionDuration || 0
    const pause = ex?.pause || 0

    const exercise = repetitionDuration * repetitions * sets
    const totalPause = pause * sets
    const exerciseTime = exercise + totalPause

    totalTime += exerciseTime
  })

  return formatTime(totalTime)
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

const inProgressPoint = computed(() => {
  const repetitions = exerciseInProgress.value?.repetitions || 0
  const repetitionDuration = exerciseInProgress.value?.repetitionDuration || 0
  const pause = exerciseInProgress.value?.pause || 0

  let value = 0
  console.log(
    '🚀 ~ inProgressPoint ~ countdown.value:',
    countdown.value,
    isInProgressPause.value
  )

  // if (countdown.value === 0 && isInProgressPause.value) {
  //   countdown.value = pause
  // } else if (countdown.value === 0) {
  //   countdown.value = repetitions * repetitionDuration
  // }

  if (countdown.value > 0) {
    value = countdown.value
  } else if (isInProgressExercise.value) {
    value = repetitions * repetitionDuration
  } else if (isInProgressPause.value) {
    value = pause
  }

  return formatTime(value)
})

async function runExercise(
  exercise: Exercise,
  isPause: boolean,
  isLastExerciseInCurrentSet: boolean
) {
  if (!exercise || !isTrainingStarted.value) return

  const exerciseName = exercise.exerciseName
  const repetitions = exercise.repetitions
  const pause = exercise.pause
  const countdownBeforeStart = exercise.countdownBeforeStart
  const audioStart = exercise.audioStart
  const audioEnd = exercise.audioEnd
  const announcePauseDuration = exercise.announcePauseDuration
  const announcePauseEnd = exercise.announcePauseEnd
  const repetitionDuration = exercise.repetitionDuration

  const audio = playBackgroundAudio()

  try {
    isInProgressExercise.value = true
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

    startCountdown(repetitionDuration * repetitions, (time: number) => {
      countdown.value = time * 1000
    })

    audio.play('melodies/melody_1.mp3')

    const repetition = startCountRepetition(repetitionDuration, repetitions)

    await repetition.counter(async (count: number) => {
      speak(`${count}`, { rate: 0.3 })
    })

    audio.stop()

    isInProgressExercise.value = false

    // End exercise

    // Start pause

    if (isPause) {
      isInProgressPause.value = true

      if (audioEnd) {
        await speak('Конец упражнения')
      }

      if (isLastExerciseInCurrentSet) await speak('Конец текущего сета')

      const puseInsecond = pause / 1000

      if (announcePauseDuration) await speak(`Пауза ${puseInsecond} секунд`)

      startCountdown(pause, (time: number) => {
        countdown.value = time * 1000
      })

      audio.play('melodies/timer-tiking.mp3', { volume: 1 })

      await pauseCountRepetition(puseInsecond)

      audio.stop()

      if (announcePauseEnd) {
        await speak('Конец паузы')
      }

      isInProgressPause.value = false
    }
  } catch (e) {
    console.log(e)
  }
}

async function runExercises() {
  const currentExercises = selectedExercises.value
  if (!currentExercises.length || !isTrainingStarted.value) return

  const totalSets = Math.max(...currentExercises.map((ex) => ex.sets))

  for (let setIndex = 0; setIndex < totalSets; setIndex++) {
    if (!isTrainingStarted.value) break

    for (let i = 0; i < currentExercises.length; i++) {
      if (!isTrainingStarted.value) break
      exerciseInProgress.value = currentExercises[i]
      if (
        exerciseInProgress.value.completedSets >= exerciseInProgress.value.sets
      )
        continue

      const isLastExerciseInSet = i === currentExercises.length - 1
      const isLastSet = setIndex === totalSets - 1

      // Логика паузы и конца сета:
      let isPauseNeeded = true
      let announceSetEnd = false

      if (isLastExerciseInSet) {
        if (isLastSet) {
          // последний сет → НЕ нужна пауза, но сказать о завершении сета
          isPauseNeeded = false
          announceSetEnd = true
        } else {
          // не последний сет → нужна пауза после конца сета
          isPauseNeeded = true
          announceSetEnd = true
        }
      }

      // Выполнить упражнение
      await runExercise(exerciseInProgress.value, isPauseNeeded, announceSetEnd)

      // Обновляем completedSets
      const index = exercises.value.findIndex(
        (ex) => ex.id === exerciseInProgress.value?.id
      )
      if (index !== -1) {
        exercises.value[index] = {
          ...exercises.value[index],
          completedSets: exercises.value[index].completedSets + 1
        }
      }
    }
  }

  await speak('Тренировка завершена')
  resetPlayer()
}

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

watch([isInProgressExercise, isInProgressPause], () => {
  countdown.value = 0
})
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
          orientation="vertical"
          @drop="onDrop"
          drag-handle-selector=".drag-handle"
          class="px-3"
        >
          <Draggable
            v-for="(exercise, index) in exercises"
            :key="index"
            class="w-100 my-3"
          >
            <v-row no-gutters class="drag-handle">
              <v-col cols="12" class="pt-0">
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
                            <span>Продолжительность подхода:</span>
                            <span>
                              {{
                                formatTime(
                                  exercise.repetitionDuration *
                                    exercise.repetitions
                                )
                              }}
                            </span>
                          </p>
                          <p class="w-100 d-flex justify-space-between">
                            <span>Пауза:</span
                            ><span>{{ formatTime(exercise.pause) }}</span>
                          </p>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </Draggable>
        </Container>
      </v-container>
    </v-main>
    <audio ref="backgroundAudio" loop></audio>

    <v-footer
      v-if="!isInProgressExercise"
      app
      fixed
      class="d-flex flex-column"
      elevation="3"
      style="border-radius: 16px 16px 0 0"
    >
      <SharedFooterContent
        :playerState="playerState"
        :isInProgressPause="isInProgressPause"
        :exerciseInProgress="exerciseInProgress"
        :inProgressPoint="inProgressPoint"
        :totalSelectedExercises="totalSelectedExercises"
        :totalExercisesDuration="totalExercisesDuration"
        :isStartButtonDisabled="isStartButtonDisabled"
        @startPlayer="startPlayer"
        @pausePlayer="pausePlayer"
        @countinuePlayer="countinuePlayer"
        @resetPlayer="resetPlayer"
      />
    </v-footer>
    <v-bottom-sheet
      v-model="isTrainingStarted"
      @update:model-value="resetPlayer"
    >
      <v-card
        class="text-center"
        height="200"
        style="border-radius: 16px 16px 0 0"
      >
        <v-card-text>
          <SharedFooterContent
            :playerState="playerState"
            :isInProgressPause="isInProgressPause"
            :exerciseInProgress="exerciseInProgress"
            :inProgressPoint="inProgressPoint"
            :totalSelectedExercises="totalSelectedExercises"
            :totalExercisesDuration="totalExercisesDuration"
            :isStartButtonDisabled="isStartButtonDisabled"
            @startPlayer="startPlayer"
            @pausePlayer="pausePlayer"
            @countinuePlayer="countinuePlayer"
            @resetPlayer="resetPlayer"
          />
        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </v-app>
</template>
