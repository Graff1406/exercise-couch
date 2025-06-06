<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
// import { TextToSpeech } from '@capacitor-community/text-to-speech'
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
import draggable from 'vuedraggable'

import ExerciseForm from './components/ExerciseForm.vue'
import SharedFooterContent from './components/SharedFooterContent.vue'

import { type Exercise } from './types/Exercise'
import { type PlayerState } from './types/PlayerState'
import { type Group } from './types/Group'
import { usePauseDurationOptions } from './composables/useExerciseFlow'
import { useAudioPlayer } from './composables/useAudioPlayer'

// const { pauseDurationOptions } = usePauseDurationOptions()
// const saved = localStorage.getItem('pauseBetweenSets')

const backgroundAudio = ref<HTMLAudioElement | null>(null)

const selectRef = ref(null)
const showForm = ref(false)
const exercises = ref<Exercise[]>([])
const isInProgressPause = ref(false)
const isInProgressExercise = ref(false)
const isTrainingStarted = ref(false)
// const isLastExercisePauseUsed = ref(!Boolean(saved))

const playerState = ref<PlayerState>('idle')
const editMode = ref(false)
const exerciseInProgress = ref<Exercise | null>(null)
const inProgressExercisesGroup = ref<Group | null>(null)
const nextExerciseInCurrentSet = ref<Exercise | null>(null)
const editExercise = ref<Exercise | null>(null)
const countdown = ref(0)
const currentIndex = ref(0)
const exerciseRepetitionCount = ref(0)
// const countdownInterval = ref<ReturnType<typeof setInterval> | null>(null)
const selectedExercises = ref<Exercise[]>([])
const draggableGroups = ref<Group[]>([])

// Composabels

const {
  beep,
  speak,
  countdownExerciseOrPause,
  startCountRepetition,
  waitWhilePaused
} = usePauseDurationOptions(playerState)

const { loadAudioPlayer, stopAudioPlayer } = useAudioPlayer(playerState)

// const pauseBetweenSets = ref(saved ? Number(saved) : 0)

let countRepetitionInterval: ReturnType<typeof setInterval> | null = null

const loadExercises = () => {
  const storedExercises = localStorage.getItem('exercises')
  exercises.value = storedExercises ? JSON.parse(storedExercises) : []
}

// const speak = async (
//   text: string,
//   { rate = 1 } = { rate: 1 }
// ): Promise<void> => {
//   if (playerState.value === 'reset') {
//     return
//   }

//   try {
//     await TextToSpeech.speak({
//       text,
//       lang: 'ru-RU',
//       rate,
//       pitch: 1.0,
//       volume: 1.0
//     })
//   } catch (error) {
//     console.error('TextToSpeech error:', error)
//   }
// }

// const beep = (duration = 200, frequency = 440, volume = 0.7) => {
//   const context = new AudioContext()
//   const oscillator = context.createOscillator()
//   const gain = context.createGain()

//   oscillator.connect(gain)
//   gain.connect(context.destination)

//   oscillator.frequency.value = frequency
//   gain.gain.value = volume

//   oscillator.start()
//   oscillator.stop(context.currentTime + duration / 1000)
// }

const calculateSpeechRate = (exerciseSpeed: number): number => {
  // Нормализуем к диапазону 500-3000 мс (0.5-3 сек)
  const minSpeed = 500
  const maxSpeed = 3000

  // Ограничиваем входное значение
  const speed = Math.max(minSpeed, Math.min(maxSpeed, exerciseSpeed))

  // Формула обратной зависимости (чем быстрее упражнение, тем быстрее речь)
  const normalized = (speed - minSpeed) / (maxSpeed - minSpeed) // 0-1
  const rate = 2.5 - normalized * 2 // 2.5 → 0.5

  // Округляем до десятых и возвращаем
  return Math.round(rate * 10) / 10
}

// const startCountRepetition = (interval: number = 1000, repetitions: number) => {
//   let count = 0
//   let isStopped = false

//   const counter = async (callbackProcessing?: (count: number) => void) => {
//     while (count < repetitions) {
//       await waitWhilePaused()

//       count++
//       if (callbackProcessing) callbackProcessing(count)

//       await new Promise((resolve) => setTimeout(resolve, interval))

//       if (isStopped) break
//     }
//   }

//   return {
//     counter,
//     stop: () => {
//       isStopped = true
//     }
//   }
// }

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
  editExercise.value = null
}

// async function startCountdown(
//   time: number,
//   callbackProcessing?: (countdown: number) => void,
//   interval: number = 1000
// ): Promise<void> {
//   let countdown = time / 1000

//   if (callbackProcessing) callbackProcessing(countdown)

//   while (countdown > 0) {
//     await waitWhilePaused()

//     await new Promise((resolve) => setTimeout(resolve, interval))

//     countdown--

//     if (callbackProcessing) callbackProcessing(countdown)
//   }

//   return
// }

// const pauseCountdown = () => {
//   if (countdownInterval.value) {
//     clearInterval(countdownInterval.value)
//     countdownInterval.value = null
//   }
// }

// const resetCountdown = () => {
//   pauseCountdown()
//   countdown.value = 0
// }

const startPlayer = async (exercises: Exercise[], group: Group) => {
  if (playerState.value === 'idle') {
    playerState.value = 'running'
    console.log('startPlayer', playerState.value)
    // Check if selectRef exists and has a validate method before calling it
    if (selectRef.value && 'validate' in selectRef.value) {
      const erros = await (selectRef.value as any).validate()
      if (erros?.length) return // Stop if validation fails
    }
    isTrainingStarted.value = true
    selectedExercises.value = exercises
    inProgressExercisesGroup.value = group
    runExercises()
  } else {
    console.log('startPlayer --> paused', playerState.value)
    playerState.value = 'running'
  }
}

const countinuePlayer = () => {
  playerState.value = 'running'
  console.log('🚀 ~ countinuePlayer', playerState.value)
}

const pausePlayer = async () => {
  playerState.value = 'paused'
  console.log('pausePlayer', playerState.value)
}

const resetPlayer = () => {
  playerState.value = 'idle'

  console.log('resetPlayer', playerState.value)
  window.location.reload()

  exerciseInProgress.value = null
  currentIndex.value = 0
  isInProgressPause.value = false
  isInProgressExercise.value = false
  isTrainingStarted.value = false
  selectedExercises.value = []
  clearInterval(countRepetitionInterval!)
  countRepetitionInterval = null
}

// const playBackgroundAudio = () => {
//   return {
//     play: async (src: string, { volume = 0.3 } = {}) => {
//       if (!backgroundAudio.value) return

//       backgroundAudio.value.pause()

//       backgroundAudio.value.src = src
//       backgroundAudio.value.volume = volume

//       try {
//         await backgroundAudio.value.play()
//       } catch (err) {
//         console.warn(err)
//       }
//     },

//     stop: () => {
//       if (!backgroundAudio.value) return
//       backgroundAudio.value.pause()
//     }
//   }
// }

const onDrop = () => {
  draggableGroups.value = JSON.parse(JSON.stringify(draggableGroups.value))
  console.log('🚀 ~ onDrop ~ draggableGroups.value:', draggableGroups.value)
  // localStorage.setItem('exercises', JSON.stringify(draggableGroups.value))
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
      exercises.value = parsedExercises
    }
  }
}

const handleClearGroup = (group: Group) => {
  const storedExercises = localStorage.getItem('exercises')
  if (storedExercises) {
    const parsedExercises = JSON.parse(storedExercises) as Exercise[]
    const filteredExercises = parsedExercises.filter(
      (exercise: Exercise) => exercise.group.id !== group.id
    )
    localStorage.setItem('exercises', JSON.stringify(filteredExercises))
    exercises.value = filteredExercises
  }
}

const formatTime = (totalTime: number): string => {
  const totalSeconds = Math.ceil(totalTime / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Computeds

const totalSelectedExercises = computed(() => {
  return selectedExercises.value.length
})

const totalExercisesDuration = computed(() => {
  let totalTime = 0
  selectedExercises.value.forEach((ex: Exercise) => {
    const sets = ex?.sets || 0
    const repetitions = ex?.repetitionsPerSet?.reduce(
      (sum: number, current: number) => sum + current,
      0
    )
    const repetitionDuration = ex?.repetitionDuration || 0
    const pause = ex?.pause || 0

    const exercise = repetitionDuration * repetitions * sets
    const totalPause = pause * sets
    const exerciseTime = exercise + totalPause

    totalTime += exerciseTime
  })

  return formatTime(totalTime)
})

const inProgressPoint = computed(() => {
  const repetitions = exerciseInProgress.value?.repetitions || 0
  const repetitionDuration = exerciseInProgress.value?.repetitionDuration || 0
  const pause = exerciseInProgress.value?.pause || 0

  let value = 0

  if (isInProgressExercise.value) {
    value = repetitions * repetitionDuration
  } else if (isInProgressPause.value) {
    const initialCountdown = pause / 1000
    value = pause - (initialCountdown - countdown.value) * 1000
  }

  return formatTime(value)
})

const groups = computed(() => {
  const groupObj: Record<number, Group & { exercises: Exercise[] }> = {}

  for (const exercise of exercises.value) {
    const { id, name } = exercise?.group ?? {}

    if (!groupObj[id]) {
      groupObj[id] = {
        id,
        name,
        exercises: [exercise]
      }
    } else {
      groupObj[id].exercises.push(exercise)
    }
  }

  return Object.values(groupObj)
})

// async function waitWhilePaused(): Promise<void> {
//   return new Promise((resolve) => {
//     if (playerState.value !== 'paused') {
//       resolve()
//       return
//     }

//     const stop = watch(playerState, function (val) {
//       console.log('🚀 ~ stop ~ playerState:', val)
//       if (val !== 'paused') {
//         stop()
//         resolve()
//       }
//     })
//   })
// }

async function runExercise(
  exercise: Exercise | null,
  isPause: boolean,
  isLastExerciseInCurrentSet: boolean,
  nextExercise: Exercise | null
) {
  if (!exercise || !isTrainingStarted.value) return

  const exerciseName = exercise.exerciseName
  const repetitions = exercise?.repetitions || 0
  const pause = exercise.pause
  const countdownBeforeStart = exercise.countdownBeforeStart
  const audioQuantityExercise = exercise.audioQuantityExercise
  const audioStart = exercise.audioStart
  const audioMiddle = exercise.audioMiddle
  const audioBeforeEnd = exercise.audioBeforeEnd
  const audioEnd = exercise.audioEnd
  const announcePauseDuration = exercise.announcePauseDuration
  const announcePauseEnd = exercise.announcePauseEnd
  const repetitionDuration = exercise.repetitionDuration

  try {
    isInProgressExercise.value = true
    if (audioStart) {
      await speak('Упражнение ' + exerciseName + ' начинается ', { rate: 1.3 })
    }

    if (audioQuantityExercise) {
      await speak(`Количество повторений ${repetitions}`, { rate: 1.3 })
    }

    if (countdownBeforeStart) {
      let countdownBeforeStartInSeconds = 3

      while (countdownBeforeStartInSeconds > 0) {
        await speak(countdownBeforeStartInSeconds.toString())
        await new Promise((resolve) => setTimeout(resolve, 600))
        countdownBeforeStartInSeconds--
      }
    }

    // Start exercise
    loadAudioPlayer('melodies/melody_1.mp3')

    await speak('Старт', { rate: 1.3 })

    countdownExerciseOrPause(repetitionDuration * repetitions, countdown)

    const repetition = startCountRepetition(repetitionDuration, repetitions)

    await repetition.counter(async (count: number) => {
      const rate = calculateSpeechRate(repetitionDuration)

      if (repetitions > 8 && repetitions - 1 === count && audioBeforeEnd) {
        speak('Еще раз', {
          rate
        })
      } else if (
        repetitions > 8 &&
        Math.ceil(repetitions / 2) === count &&
        audioMiddle
      ) {
        speak('Половина', { rate })
      } else {
        await waitWhilePaused()
        speak(`${count}`, { rate })
        if (repetitions > 3 && count > repetitions - 3) {
          const leftCount = count - (repetitions - 3)
          beep(150, leftCount * 500, 0.3)
        }
      }
      exerciseRepetitionCount.value = count
    })

    stopAudioPlayer()

    isInProgressExercise.value = false
    if (audioEnd) {
      exerciseRepetitionCount.value = 0
      await speak('Конец упражнения')
    }

    // End exercise

    // Start pause

    const puseInsecond = pause / 1000
    if (isPause && puseInsecond) {
      isInProgressPause.value = true
      if (isLastExerciseInCurrentSet) await speak('Конец текущего сета')

      // const puseInsecond =
      //   !isLastExercisePauseUsed.value && isLastExerciseInCurrentSet
      //     ? pauseBetweenSets.value / 1000
      //     : pause / 1000
      if (announcePauseDuration) await speak(`Пауза ${puseInsecond} секунд`)

      countdownExerciseOrPause(pause, countdown)

      loadAudioPlayer('melodies/timer-tiking.mp3')

      if (pause > 5000 && nextExercise?.exerciseName) {
        setTimeout(() => {
          speak('Следующее упражнение ' + nextExercise.exerciseName)
        }, Math.round(nextExercise?.pause / 2))
      }

      await pauseCountRepetition(puseInsecond)

      stopAudioPlayer()

      isInProgressPause.value = false

      if (announcePauseEnd) {
        await speak('Конец паузы')
      }
    }
  } catch (e) {
    console.log('run Exercise error', e)
  }
}

async function runExercises() {
  const currentExercises = selectedExercises.value
  if (!currentExercises.length || !isTrainingStarted.value) return

  const totalSets = Math.max(
    ...currentExercises.map((exercise: Exercise) => exercise.sets)
  )

  for (let setIndex = 0; setIndex < totalSets; setIndex++) {
    if (!isTrainingStarted.value) break

    for (let i = 0; i < currentExercises.length; i++) {
      await waitWhilePaused()

      if (!isTrainingStarted.value) break

      const currentExercise = currentExercises[i]
      exerciseInProgress.value = {
        ...currentExercise,
        repetitions: currentExercise.repetitionsPerSet[setIndex] || 0
      }

      nextExerciseInCurrentSet.value = currentExercises[i + 1]
        ? {
            ...currentExercises[i + 1],
            repetitions: currentExercise.repetitionsPerSet[setIndex] || 0
          }
        : null

      if (currentExercise.completedSets >= currentExercise.sets) continue

      const isLastExerciseInSet = i === currentExercises.length - 1
      const isLastSet = setIndex === totalSets - 1

      // Determine the next exercise

      // let nextExercise: typeof currentExercise | null = null
      // if (!isLastExerciseInSet) {
      //   nextExercise = currentExercises[i + 1]
      // } else if (!isLastSet) {
      //   // The next exercise in a new set is the first one
      //   nextExercise = currentExercises[0]
      // }

      // Pause and set end logic
      let isPauseNeeded = true
      let announceSetEnd = false

      if (isLastExerciseInSet) {
        if (isLastSet) {
          isPauseNeeded = false
          announceSetEnd = true
        } else {
          isPauseNeeded = true
          announceSetEnd = true
        }
      }

      await runExercise(
        exerciseInProgress.value,
        isPauseNeeded,
        announceSetEnd,
        nextExerciseInCurrentSet.value
      )

      // Обновляем completedSets
      const index = exercises.value.findIndex(
        (exercise: Exercise) => exercise.id === currentExercise.id
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
    exercises.value = JSON.parse(storedExercises)
  } else {
    exercises.value = []
  }
})

watch([isInProgressExercise, isInProgressPause], () => {
  countdown.value = 0
})

watch(
  () => groups.value,
  (newGroups) => {
    draggableGroups.value = JSON.parse(JSON.stringify(newGroups))
  },
  { immediate: true }
)
</script>

<template>
  <v-responsive>
    <v-app>
      <v-app-bar class="px-2" elevation="1" density="compact" flat>
        <v-btn
          color="indigo"
          @click="$emit('toggleDrawer')"
          icon="mdi-weight-lifter"
          variant="tonal"
          density="compact"
        ></v-btn>

        <v-spacer></v-spacer>

        <v-btn
          color="indigo"
          @click="toggleForm"
          class="my-6"
          size="large"
          variant="tonal"
          prepend-icon="mdi-plus"
          density="compact"
        >
          Упражнение
        </v-btn>
      </v-app-bar>
      <v-main>
        <v-container fluid class="pa-0">
          <ExerciseForm
            v-model="showForm"
            @close="closeForm"
            :editMode="editMode"
            :editExercise="editExercise"
            :groups="groups"
            @save="loadExercises"
          />

          <draggable
            v-if="draggableGroups.length"
            v-model="draggableGroups"
            item-key="id"
            :animation="200"
            :delay="200"
            :delay-on-touch-only="true"
            ghost-class="ghost"
            chosen-class="chosen"
            @end="onDrop"
          >
            <template #item="{ element, index }">
              <v-row
                no-gutters
                class="drag-handle d-flex flex-column pa-3 pb-0"
              >
                <v-col cols="12" class="pt-0">
                  <v-card variant="tonal" color="indigo">
                    <v-card-title
                      class="d-flex align-center"
                      style="overflow: hidden"
                    >
                      <span class="ml-2 text-truncate">
                        {{ element.name }}
                      </span>

                      <v-spacer></v-spacer>

                      <v-menu>
                        <template v-slot:activator="{ props }">
                          <v-btn
                            icon
                            density="compact"
                            variant="plain"
                            v-bind="props"
                            class="flex-shrink-0"
                          >
                            <v-icon>mdi-dots-vertical</v-icon>
                          </v-btn>
                        </template>
                        <v-list>
                          <v-list-item @click="handleClearGroup(element)"
                            >Очистить</v-list-item
                          >
                        </v-list>
                      </v-menu>
                    </v-card-title>

                    <v-divider></v-divider>

                    <v-card-text class="pa-0">
                      <v-expansion-panels elevation="0" class="pa-3 pb-0">
                        <v-expansion-panel bg-color="#edeefa">
                          <v-expansion-panel-title
                            class="text-indigo bg-indigo-lighten-5 font-weight-regular"
                          >
                            Упражнения
                          </v-expansion-panel-title>
                          <v-expansion-panel-text class="pa-1">
                            <draggable
                              v-model="element.exercises"
                              item-key="id"
                              :animation="200"
                              :delay="200"
                              :delay-on-touch-only="true"
                              ghost-class="ghost"
                              chosen-class="chosen"
                              @end="onDrop"
                            >
                              <template #item="{ element }">
                                <v-row
                                  no-gutters
                                  class="drag-handle d-flex flex-column mt-1"
                                >
                                  <v-col cols="12" class="pt-0">
                                    <v-expansion-panels elevation="0">
                                      <v-expansion-panel
                                        :title="element.exerciseName"
                                        bg-color="#edeefa"
                                      >
                                        <v-expansion-panel-text class="pa-3">
                                          <div
                                            class="text-indigo user-select-none"
                                          >
                                            <div
                                              v-for="(
                                                item, index
                                              ) in element.repetitionsPerSet"
                                              :key="Math.random()"
                                            >
                                              <p
                                                class="w-100 d-flex justify-space-between font-weight-bold"
                                              >
                                                {{ `Сет ${index + 1}:` }}
                                              </p>
                                              <p
                                                class="w-100 d-flex justify-space-between pl-3"
                                              >
                                                <span>Повторений:</span
                                                ><span>{{ item }}</span>
                                              </p>
                                              <p
                                                class="w-100 d-flex justify-space-between pl-3"
                                              >
                                                <span>Продолжительность:</span>
                                                <span>
                                                  {{
                                                    formatTime(
                                                      item *
                                                        element.repetitionDuration +
                                                        element.pause
                                                    )
                                                  }}
                                                </span>
                                              </p>
                                            </div>

                                            <v-divider class="my-4"></v-divider>

                                            <p
                                              class="w-100 d-flex justify-space-between"
                                            >
                                              <span class="font-weight-medium">
                                                Пауза:</span
                                              ><span>{{
                                                formatTime(element.pause)
                                              }}</span>
                                            </p>

                                            <p
                                              class="w-100 d-flex justify-space-between"
                                            >
                                              <span class="font-weight-medium">
                                                Общее время:</span
                                              ><span>{{
                                                formatTime(
                                                  element.repetitionsPerSet.reduce(
                                                    (
                                                      acc: number,
                                                      reps: number,
                                                      index: number
                                                    ) => {
                                                      const setTime =
                                                        reps *
                                                        element.repetitionDuration
                                                      const pauseTime =
                                                        index <
                                                        element.sets.length - 1
                                                          ? element.pause
                                                          : 0
                                                      return (
                                                        acc +
                                                        setTime +
                                                        pauseTime
                                                      )
                                                    },
                                                    0
                                                  )
                                                )
                                              }}</span>
                                            </p>
                                          </div>
                                          <v-divider class="my-4"></v-divider>
                                          <div
                                            class="d-flex justify-space-between"
                                          >
                                            <v-btn
                                              color="indigo"
                                              text="Редактировать"
                                              variant="tonal"
                                              @click="handleEdit(element)"
                                            ></v-btn>
                                            <v-btn
                                              color="error"
                                              text="Удалить"
                                              variant="tonal"
                                              @click="handleDelete(element)"
                                            ></v-btn>
                                          </div>
                                        </v-expansion-panel-text>
                                      </v-expansion-panel>
                                    </v-expansion-panels>
                                  </v-col>
                                </v-row>
                              </template>
                            </draggable>
                          </v-expansion-panel-text>
                        </v-expansion-panel>
                      </v-expansion-panels>

                      <div>
                        <p class="text-caption text-center pa-3">
                          {{
                            `Между сетами использовуеться пауза (${formatTime(
                              element.exercises[element.exercises.length - 1]
                                ?.pause
                            )}) посленего упражнения`
                          }}
                        </p>
                        <!-- <v-select
                          v-if="!isLastExercisePauseUsed"
                          v-model="pauseBetweenSets"
                          ref="selectRef"
                          :items="pauseDurationOptions"
                          :rules="[
                            (v) =>
                              !!v || 'Выберите длительность паузы между сетами'
                          ]"
                          item-title="label"
                          item-value="value"
                          label="Длительность паузы между сетами"
                          hint="Пауза между сетами"
                          density="comfortable"
                          variant="outlined"
                        >
                        </v-select>

                        <v-checkbox
                          v-model="isLastExercisePauseUsed"
                          :items="pauseDurationOptions"
                          density="comfortable"
                          hide-details
                        >
                          <template v-slot:label>
                            <span class="text-caption text-start">
                              {{
                                `Использовать паузу (${formatTime(
                                  element.exercises[
                                    element.exercises.length - 1
                                  ]?.pause
                                )}) посленего упражнения между
                              сетами`
                              }}
                            </span>
                          </template>
                        </v-checkbox> -->
                      </div>
                    </v-card-text>

                    <v-divider></v-divider>

                    <template
                      v-if="
                        inProgressExercisesGroup === null ||
                        element?.id === inProgressExercisesGroup?.id
                      "
                      v-slot:actions
                    >
                      <div
                        v-if="playerState === 'paused'"
                        class="d-flex justify-center w-100"
                      >
                        <v-btn
                          color="indigo"
                          size="large"
                          variant="tonal"
                          density="comfortable"
                          class="mx-2"
                          @click="startPlayer(element.exercises, element)"
                        >
                          <!-- <v-icon>mdi-play</v-icon> -->
                          Тренироваться
                        </v-btn>
                        <v-btn
                          color="error"
                          size="large"
                          variant="tonal"
                          density="comfortable"
                          class="mx-2"
                          @click="resetPlayer"
                        >
                          <v-icon>mdi-stop</v-icon>
                        </v-btn>
                      </div>
                      <v-alert
                        v-else-if="playerState === 'running'"
                        border="start"
                        color="indigo"
                        variant="tonal"
                        density="compact"
                        class="w-100"
                      >
                        Тренировка выпольняется
                      </v-alert>
                      <v-btn
                        v-else
                        color="indigo"
                        text="Начать тренировку"
                        variant="tonal"
                        block
                        @click="startPlayer(element.exercises, element)"
                      ></v-btn>
                    </template>
                  </v-card>
                </v-col>

                <v-divider
                  v-if="groups.length !== index + 1"
                  class="mt-3"
                ></v-divider>
              </v-row>
            </template>
          </draggable>
          <div v-else class="mt-16">
            <p class="text-center text-indigo px-6">
              Вы еще не добавили ни одного упражнения.
            </p>
          </div>
        </v-container>
      </v-main>
      <audio ref="backgroundAudio" loop></audio>
      <v-bottom-sheet
        :modelValue="playerState === 'running'"
        @update:model-value="pausePlayer"
      >
        <v-card
          class="text-center"
          height="400"
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
              :exerciseRepetitionCount="exerciseRepetitionCount"
              :nextExerciseInCurrentSet="nextExerciseInCurrentSet"
              @startPlayer="startPlayer"
              @pausePlayer="pausePlayer"
              @countinuePlayer="countinuePlayer"
              @resetPlayer="resetPlayer"
            />
          </v-card-text>
        </v-card>
      </v-bottom-sheet>
    </v-app>
  </v-responsive>
</template>

<style>
.item {
  padding: 10px;
  margin-bottom: 5px;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  cursor: move;
  transition: transform 0.2s ease;
}

.ghost {
  opacity: 0.4;
}

.chosen {
  background-color: #c5cae9;
}
.v-expansion-panel-title {
  outline: none;
  border: none;
  box-shadow: none;
}
.v-expansion-panel-text__wrapper {
  padding: 0 !important;
}
</style>
